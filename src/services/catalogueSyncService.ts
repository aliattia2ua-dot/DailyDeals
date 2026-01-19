// src/services/catalogueSyncService.ts
import firestore from '@react-native-firebase/firestore';
import { getCatalogueById } from '../data/catalogueRegistry';

/**
 * Sync a local catalogue from catalogueRegistry to Firestore
 * This ensures the catalogue document exists before adding offers
 */
export const syncCatalogueToFirestore = async (catalogueId: string): Promise<void> => {
  try {
    console.log(`🔄 Syncing catalogue ${catalogueId} to Firestore...`);

    // Check if catalogue already exists in Firestore
    const catalogueRef = firestore().collection('catalogues').doc(catalogueId);
    const catalogueDoc = await catalogueRef.get();

    if (catalogueDoc.exists) {
      console.log('✅ Catalogue already exists in Firestore');
      return;
    }

    // Get catalogue data from local registry
    const localCatalogue = getCatalogueById(catalogueId);

    if (!localCatalogue) {
      throw new Error(`Catalogue ${catalogueId} not found in local registry`);
    }

    // Prepare catalogue data for Firestore
    const catalogueData = {
      id: localCatalogue.id,
      storeId: localCatalogue.storeId,
      storeName: localCatalogue.titleAr.replace('عروض ', ''), // Extract store name
      titleAr: localCatalogue.titleAr,
      titleEn: localCatalogue.titleEn,
      startDate: localCatalogue.startDate,
      endDate: localCatalogue.endDate,
      coverImage: localCatalogue.coverImage,
      pdfUrl: localCatalogue.pdfUrl || null,
      pageCount: localCatalogue.pages?.length || 0,
      isActive: new Date(localCatalogue.endDate) >= new Date(),
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Write to Firestore
    await catalogueRef.set(catalogueData);

    console.log('✅ Catalogue synced to Firestore successfully');
  } catch (error) {
    console.error('❌ Error syncing catalogue to Firestore:', error);
    throw error;
  }
};

/**
 * Sync all catalogues from local registry to Firestore
 * Useful for initial setup or migration
 */
export const syncAllCataloguesToFirestore = async (): Promise<void> => {
  try {
    console.log('🔄 Syncing all catalogues to Firestore...');

    // You'll need to import your full catalogue list
    // For now, this is a placeholder - you'd need to loop through all catalogue IDs
    const catalogueIds = [
      // Add your catalogue IDs here
      // Example: 'carrefour-weekly-2025-01', 'lulu-monthly-2025-01'
    ];

    for (const catalogueId of catalogueIds) {
      await syncCatalogueToFirestore(catalogueId);
    }

    console.log(`✅ Synced ${catalogueIds.length} catalogues to Firestore`);
  } catch (error) {
    console.error('❌ Error syncing catalogues:', error);
    throw error;
  }
};

/**
 * Check if a catalogue exists in Firestore
 */
export const checkCatalogueExists = async (catalogueId: string): Promise<boolean> => {
  try {
    const catalogueRef = firestore().collection('catalogues').doc(catalogueId);
    const catalogueDoc = await catalogueRef.get();
    return catalogueDoc.exists;
  } catch (error) {
    console.error('Error checking catalogue:', error);
    return false;
  }
};