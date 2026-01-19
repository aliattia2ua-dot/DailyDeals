// src/utils/cleanupCatalogues.ts
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

/**
 * ONE-TIME CLEANUP: Add 'id' field to all existing catalogues
 */
export const fixExistingCatalogues = async (): Promise<void> => {
  try {
    console.log('🔧 Starting catalogue cleanup...');

    const cataloguesRef = collection(db, 'catalogues');
    const querySnapshot = await getDocs(cataloguesRef);

    console.log(`📚 Found ${querySnapshot.size} catalogues to fix`);

    let fixed = 0;
    let skipped = 0;

    for (const document of querySnapshot.docs) {
      const data = document.data();
      const firestoreId = document.id;

      if (data.id && data.id === firestoreId) {
        console.log(`⭐️ Skipping ${firestoreId} - already has correct id field`);
        skipped++;
        continue;
      }

      const docRef = doc(db, 'catalogues', firestoreId);
      await updateDoc(docRef, {
        id: firestoreId,
      });

      console.log(`✅ Fixed ${firestoreId}`);
      fixed++;
    }

    console.log('🎉 Cleanup complete!');
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ⭐️ Skipped: ${skipped}`);
    console.log(`   📊 Total: ${querySnapshot.size}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

/**
 * 🚀 Migrate B.TECH catalogue to new ID format
 * Migrates from M5KZVSXGVtdy9zttvsaV to btech-2026-01-01-0200
 */
export const migrateBTechCatalogue = async () => {
  console.log('🚀 Starting B.TECH catalogue migration...');

  const oldId = 'M5KZVSXGVtdy9zttvsaV';
  const newId = 'btech-2026-01-01-0200'; // Using your actual migrated catalogue ID

  try {
    // 1. Check if old catalogue still exists
    const oldDocRef = doc(db, 'catalogues', oldId);
    const oldDocSnap = await getDoc(oldDocRef);

    if (!oldDocSnap.exists()) {
      console.log('ℹ️ Old catalogue already migrated or deleted');

      // Check if new catalogue exists
      const newDocRef = doc(db, 'catalogues', newId);
      const newDocSnap = await getDoc(newDocRef);

      if (newDocSnap.exists()) {
        console.log('✅ New catalogue exists:', newId);

        // Just migrate offers if they still reference old ID
        await migrateOffersOnly(oldId, newId);
        return {
          success: true,
          message: 'Catalogue already migrated, updated offers only',
          oldId,
          newId,
        };
      } else {
        console.log('⚠️ Neither old nor new catalogue found');
        return {
          success: false,
          message: 'Migration already complete or catalogue not found',
        };
      }
    }

    const oldData = oldDocSnap.data();
    console.log('✅ Found old catalogue:', oldData.titleAr);

    // 2. Create new catalogue with custom ID and standardized structure
    const newCatalogueData = {
      id: newId, // Custom ID field
      storeId: oldData.storeId || 'btech',
      storeName: oldData.storeName || 'بي تك',
      titleAr: oldData.titleAr || 'بي تك',
      titleEn: oldData.titleEn || 'B.TECH',
      startDate: oldData.startDate || '2026-01-01',
      endDate: oldData.endDate || '2026-01-10',
      coverImage: oldData.coverImage,
      pages: oldData.pages || [],
      totalPages: oldData.totalPages || oldData.pages?.length || 0,
      pdfUrl: oldData.pdfUrl || null,
      pdfProcessed: true,
      categoryId: oldData.categoryId || 'electronics',
      uploadMode: oldData.pdfUrl ? 'pdf' : 'images',
      createdAt: oldData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // 3. Create new document with custom ID
    const newDocRef = doc(db, 'catalogues', newId);
    await setDoc(newDocRef, newCatalogueData);
    console.log('✅ Created new catalogue with ID:', newId);

    // 4. Migrate offers
    const { flatCount, subCount } = await migrateOffersOnly(oldId, newId);

    // 5. Delete old catalogue
    await deleteDoc(oldDocRef);
    console.log('✅ Deleted old catalogue');

    console.log('🎉 Migration complete!');
    return {
      success: true,
      message: `Successfully migrated catalogue, ${flatCount} flat offers, and ${subCount} subcollection offers`,
      oldId,
      newId,
      flatOffersCount: flatCount,
      subcollectionOffersCount: subCount,
    };

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    throw new Error('Migration failed: ' + error.message);
  }
};

/**
 * Helper function to migrate offers only (can be called independently)
 */
async function migrateOffersOnly(oldId: string, newId: string): Promise<{ flatCount: number; subCount: number }> {
  console.log('📦 Migrating offers...');

  // Migrate offers in FLAT collection (where users query from)
  const flatOffersQuery = query(
    collection(db, 'offers'),
    where('catalogueId', '==', oldId)
  );
  const flatOffersSnapshot = await getDocs(flatOffersQuery);

  console.log(`📦 Found ${flatOffersSnapshot.size} offers in flat collection to migrate`);

  for (const offerDoc of flatOffersSnapshot.docs) {
    await updateDoc(offerDoc.ref, {
      catalogueId: newId,
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✅ Updated offer ${offerDoc.id} in flat collection`);
  }

  const flatCount = flatOffersSnapshot.size;
  console.log(`✅ Migrated ${flatCount} offers in flat collection`);

  // Migrate offers in SUBCOLLECTION (catalogues/oldId/offers -> catalogues/newId/offers)
  const subcollectionOffersRef = collection(db, 'catalogues', oldId, 'offers');
  const subcollectionOffersSnapshot = await getDocs(subcollectionOffersRef);

  console.log(`📦 Found ${subcollectionOffersSnapshot.size} offers in subcollection to migrate`);

  for (const offerDoc of subcollectionOffersSnapshot.docs) {
    const offerData = offerDoc.data();

    // Create offer in new subcollection
    const newOfferRef = doc(db, 'catalogues', newId, 'offers', offerDoc.id);
    await setDoc(newOfferRef, {
      ...offerData,
      catalogueId: newId,
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✅ Copied offer ${offerDoc.id} to new subcollection`);

    // Delete from old subcollection
    await deleteDoc(offerDoc.ref);
    console.log(`  ✅ Deleted offer ${offerDoc.id} from old subcollection`);
  }

  const subCount = subcollectionOffersSnapshot.size;
  console.log(`✅ Migrated ${subCount} offers in subcollection`);

  return { flatCount, subCount };
}

/**
 * 🗑️ Delete orphaned catalogues
 */
export const deleteOrphanedCatalogues = async (): Promise<void> => {
  try {
    console.log('🗑️ Searching for orphaned catalogues...');

    const cataloguesRef = collection(db, 'catalogues');
    const querySnapshot = await getDocs(cataloguesRef);

    console.log(`📚 Checking ${querySnapshot.size} catalogues`);

    const orphaned: string[] = [];

    for (const document of querySnapshot.docs) {
      const data = document.data();

      if (!data.pages || data.pages.length === 0) {
        orphaned.push(document.id);
        console.log(`🔍 Found orphaned: ${data.titleAr || document.id}`);
      }
    }

    if (orphaned.length === 0) {
      console.log('✅ No orphaned catalogues found');
      return;
    }

    console.log(`⚠️ Found ${orphaned.length} orphaned catalogues`);
    console.log('📋 Orphaned IDs:', orphaned);

  } catch (error) {
    console.error('❌ Error checking for orphaned catalogues:', error);
    throw error;
  }
};

/**
 * 💥 NUCLEAR: Delete ALL offers
 */
export const deleteAllOffers = async (): Promise<void> => {
  try {
    console.log('🗑️💥 NUCLEAR CLEANUP: Deleting ALL offers...');

    let totalDeleted = 0;

    // Delete flat collection offers
    const flatOffersRef = collection(db, 'offers');
    const flatOffersSnapshot = await getDocs(flatOffersRef);

    if (!flatOffersSnapshot.empty) {
      await Promise.all(
        flatOffersSnapshot.docs.map(doc => deleteDoc(doc.ref))
      );
      console.log(`✅ Deleted ${flatOffersSnapshot.size} offers from flat collection`);
      totalDeleted += flatOffersSnapshot.size;
    }

    // Delete subcollection offers
    const cataloguesRef = collection(db, 'catalogues');
    const cataloguesSnapshot = await getDocs(cataloguesRef);

    for (const catalogueDoc of cataloguesSnapshot.docs) {
      const offersSubRef = collection(db, 'catalogues', catalogueDoc.id, 'offers');
      const offersSubSnapshot = await getDocs(offersSubRef);

      if (!offersSubSnapshot.empty) {
        await Promise.all(
          offersSubSnapshot.docs.map(doc => deleteDoc(doc.ref))
        );
        totalDeleted += offersSubSnapshot.size;
      }
    }

    console.log('🎉 NUCLEAR CLEANUP COMPLETE!');
    console.log(`   💥 Total offers deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Error during nuclear cleanup:', error);
    throw error;
  }
};

/**
 * 🗑️ Delete orphaned offers
 */
export const deleteOrphanedOffers = async (): Promise<void> => {
  try {
    console.log('🗑️ Searching for orphaned offers...');

    // Get valid catalogue IDs
    const cataloguesRef = collection(db, 'catalogues');
    const cataloguesSnapshot = await getDocs(cataloguesRef);
    const validCatalogueIds = new Set<string>();

    cataloguesSnapshot.forEach(doc => {
      validCatalogueIds.add(doc.id);
      const data = doc.data();
      if (data.id) validCatalogueIds.add(data.id);
    });

    console.log(`📚 Found ${validCatalogueIds.size} valid catalogue IDs`);

    // Check for orphaned offers
    const flatOffersRef = collection(db, 'offers');
    const flatOffersSnapshot = await getDocs(flatOffersRef);

    const orphanedOffers: string[] = [];

    flatOffersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.catalogueId && !validCatalogueIds.has(data.catalogueId)) {
        orphanedOffers.push(doc.id);
      }
    });

    if (orphanedOffers.length === 0) {
      console.log('✅ No orphaned offers found');
      return;
    }

    console.log(`⚠️ Found ${orphanedOffers.length} orphaned offers`);

    // Delete orphaned offers
    await Promise.all(
      orphanedOffers.map(offerId =>
        deleteDoc(doc(db, 'offers', offerId))
      )
    );

    console.log(`✅ Deleted ${orphanedOffers.length} orphaned offers`);

  } catch (error) {
    console.error('❌ Error deleting orphaned offers:', error);
    throw error;
  }
};

/**
 * 📊 Get database statistics
 */
export const getDatabaseStats = async (): Promise<void> => {
  try {
    console.log('📊 Gathering database statistics...');

    const cataloguesSnapshot = await getDocs(collection(db, 'catalogues'));
    const cataloguesCount = cataloguesSnapshot.size;

    const flatOffersSnapshot = await getDocs(collection(db, 'offers'));
    const flatOffersCount = flatOffersSnapshot.size;

    let subcollectionOffersCount = 0;
    for (const catalogueDoc of cataloguesSnapshot.docs) {
      const offersSubSnapshot = await getDocs(
        collection(db, 'catalogues', catalogueDoc.id, 'offers')
      );
      subcollectionOffersCount += offersSubSnapshot.size;
    }

    const validCatalogueIds = new Set<string>();
    cataloguesSnapshot.forEach(doc => {
      validCatalogueIds.add(doc.id);
      const data = doc.data();
      if (data.id) validCatalogueIds.add(data.id);
    });

    let orphanedCount = 0;
    flatOffersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.catalogueId && !validCatalogueIds.has(data.catalogueId)) {
        orphanedCount++;
      }
    });

    console.log('📊 ========== DATABASE STATISTICS ==========');
    console.log(`📚 Catalogues: ${cataloguesCount}`);
    console.log(`📋 Flat Collection Offers: ${flatOffersCount}`);
    console.log(`📁 Subcollection Offers: ${subcollectionOffersCount}`);
    console.log(`⚠️  Orphaned Offers: ${orphanedCount}`);
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    throw error;
  }
};

/**
 * 🔍 Validate catalogue structure
 */
export const validateCatalogueStructure = async (): Promise<void> => {
  try {
    console.log('🔍 Validating catalogue structure...');

    const cataloguesRef = collection(db, 'catalogues');
    const querySnapshot = await getDocs(cataloguesRef);

    let valid = 0;
    let invalid = 0;

    for (const document of querySnapshot.docs) {
      const data = document.data();
      const issues: string[] = [];

      // Check required fields
      if (!data.id) issues.push('Missing id field');
      if (!data.storeId) issues.push('Missing storeId');
      if (!data.storeName) issues.push('Missing storeName');
      if (!data.titleAr) issues.push('Missing titleAr');
      if (!data.titleEn) issues.push('Missing titleEn');
      if (!data.startDate) issues.push('Missing startDate');
      if (!data.endDate) issues.push('Missing endDate');
      if (!data.coverImage) issues.push('Missing coverImage');
      if (!data.pages || !Array.isArray(data.pages)) issues.push('Missing or invalid pages array');
      if (!data.totalPages) issues.push('Missing totalPages');

      // Check ID format (should be storeId-YYYY-MM-DD-HHMM)
      const idRegex = /^[a-z]+(-\d{4}-\d{2}-\d{2}-\d{4})$/;
      if (data.id && !idRegex.test(data.id)) {
        issues.push('Invalid ID format (should be storeId-YYYY-MM-DD-HHMM)');
      }

      if (issues.length === 0) {
        valid++;
        console.log(`✅ ${document.id} (${data.titleAr})`);
      } else {
        invalid++;
        console.log(`❌ ${document.id} (${data.titleAr})`);
        issues.forEach(issue => console.log(`   • ${issue}`));
      }
    }

    console.log('🔍 ========== VALIDATION RESULTS ==========');
    console.log(`✅ Valid catalogues: ${valid}`);
    console.log(`❌ Invalid catalogues: ${invalid}`);
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Error validating catalogues:', error);
    throw error;
  }
};