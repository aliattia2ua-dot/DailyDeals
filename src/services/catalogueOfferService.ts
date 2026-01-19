// src/services/catalogueOfferService.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { getCatalogueById } from '../data/catalogueRegistry';

/**
 * Helper function to remove undefined fields from objects
 * Firestore does not accept undefined values
 */
const removeUndefinedFields = <T extends Record<string, any>>(obj: T): T => {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

export interface CatalogueOffer {
  id:  string;
  catalogueId:  string;
  pageNumber: number;
  nameAr: string;
  nameEn: string;
  descriptionAr?:  string;
  descriptionEn?: string;
  offerPrice: number;
  originalPrice?:  number;
  unit?: string;
  imageUrl: string;
  categoryId: string;
  position?: {
    x: number;
    y: number;
  };
  createdAt:  Timestamp;
  updatedAt: Timestamp;
}

/**
 * Get all offers for a specific catalogue
 */
export const getCatalogueOffers = async (catalogueId:  string): Promise<CatalogueOffer[]> => {
  try {
    console.log(`🔥 Fetching offers for catalogue:  ${catalogueId}`);

    const offersRef = collection(db, 'catalogues', catalogueId, 'offers');
    const snapshot = await getDocs(offersRef);

    const offers: CatalogueOffer[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ... doc.data()
    } as CatalogueOffer));

    console.log(`✅ Found ${offers.length} offers for catalogue ${catalogueId}`);
    return offers;
  } catch (error) {
    console.error('❌ Error fetching catalogue offers:', error);
    throw error;
  }
};

/**
 * Get offers for a specific page in a catalogue
 */
export const getPageOffers = async (
  catalogueId: string,
  pageNumber: number
): Promise<CatalogueOffer[]> => {
  try {
    const offersRef = collection(db, 'catalogues', catalogueId, 'offers');
    const q = query(offersRef, where('pageNumber', '==', pageNumber));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CatalogueOffer));
  } catch (error) {
    console.error('❌ Error fetching page offers:', error);
    throw error;
  }
};

/**
 * Add a new offer to a catalogue (DUAL WRITE PATTERN)
 * Writes to both subcollection (admin) and flat collection (users)
 */
export const addCatalogueOffer = async (
  catalogueId: string,
  offerData:  Omit<CatalogueOffer, 'id' | 'createdAt' | 'updatedAt'>,
  imageFile?: File | Blob,
  catalogueData?: any // Optional: pass catalogue data directly to avoid extra read
): Promise<string> => {
  try {
    console. log(`📤 Adding offer to catalogue ${catalogueId}: `, offerData);

    // 1. Get catalogue data for denormalization
    let catalogue = catalogueData;

    if (! catalogue) {
      console.log('⏳ Fetching catalogue data from Firestore.. .');
      const catalogueDoc = await getDoc(doc(db, 'catalogues', catalogueId));

      if (!catalogueDoc.exists()) {
        // Try to get from local registry and auto-create in Firestore
        console.log('⚠️ Catalogue not in Firestore, checking local registry...');
        const localCatalogue = getCatalogueById(catalogueId);

        if (! localCatalogue) {
          console.error(`❌ Catalogue ${catalogueId} not found anywhere`);
          throw new Error(
            `Catalogue ${catalogueId} not found.  Please ensure:\n` +
            `1. The catalogue exists in catalogueRegistry.ts\n` +
            `2. Or create it in Firestore first`
          );
        }

        // Auto-create catalogue in Firestore
        console. log('🔄 Auto-creating catalogue in Firestore...');
        const newCatalogueData = {
          id: localCatalogue.id,
          storeId: localCatalogue. storeId,
          storeName: localCatalogue.titleAr. replace('عروض ', ''),
          titleAr: localCatalogue. titleAr,
          titleEn: localCatalogue.titleEn,
          startDate: localCatalogue.startDate,
          endDate: localCatalogue.endDate,
          coverImage: localCatalogue.coverImage,
          pdfUrl: localCatalogue.pdfUrl || null,
          pageCount: localCatalogue.pages?.length || 0,
          isActive: new Date(localCatalogue.endDate) >= new Date(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'catalogues', catalogueId), newCatalogueData);
        console.log('✅ Catalogue auto-created in Firestore');

        catalogue = newCatalogueData;
      } else {
        catalogue = catalogueDoc.data();
        console.log('✅ Catalogue data fetched:', catalogue);
      }
    } else {
      console.log('✅ Using provided catalogue data');
    }

    // 2. Upload image if provided
    let imageUrl = offerData.imageUrl;
    if (imageFile) {
      const imageRef = ref(
        storage,
        `catalogue-offers/${catalogueId}/${Date.now()}_${offerData.nameEn.replace(/\s+/g, '_')}.jpg`
      );
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
      console.log('✅ Image uploaded:', imageUrl);
    }

    const now = serverTimestamp();
    const offerWithImage = removeUndefinedFields({
      ...offerData,
      imageUrl,
      catalogueId,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Add to SUBCOLLECTION (for admin management)
    const subcollectionRef = collection(db, 'catalogues', catalogueId, 'offers');
    const docRef = await addDoc(subcollectionRef, offerWithImage);

    console.log(`✅ Offer added to subcollection with ID: ${docRef.id}`);

    // 4. Add to FLAT COLLECTION (for user app queries)
    const endDate = catalogue. endDate instanceof Timestamp
      ? catalogue.endDate.toDate()
      : new Date(catalogue.endDate);
    const isActive = endDate >= new Date();

    const flatCollectionData = removeUndefinedFields({
      ...offerWithImage,
      id: docRef.id,
      // Denormalized catalogue data
      storeId: catalogue.storeId,
      storeName: catalogue. storeName || catalogue.titleAr. replace('عروض ', ''),
      catalogueTitle: catalogue.titleAr,
      catalogueStartDate: catalogue.startDate,
      catalogueEndDate: catalogue.endDate,
      isActive,
    });

    await setDoc(doc(db, 'offers', docRef.id), flatCollectionData);

    console.log('✅ Offer synced to flat collection');
    console.log('✅ Dual write complete');

    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding catalogue offer:', error);
    throw error;
  }
};

/**
 * Update an existing catalogue offer (DUAL WRITE PATTERN)
 */
export const updateCatalogueOffer = async (
  catalogueId: string,
  offerId: string,
  updates: Partial<Omit<CatalogueOffer, 'id' | 'catalogueId' | 'createdAt'>>,
  imageFile?: File | Blob
): Promise<void> => {
  try {
    console.log(`🔄 Updating offer ${offerId} in catalogue ${catalogueId}`);

    // 1. Upload new image if provided
    let imageUrl = updates.imageUrl;
    if (imageFile) {
      const imageRef = ref(
        storage,
        `catalogue-offers/${catalogueId}/${Date.now()}_${updates.nameEn || 'offer'}.jpg`
      );
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
      console.log('✅ New image uploaded:', imageUrl);
    }

    const updateData = removeUndefinedFields({
      ...updates,
      ...(imageUrl && { imageUrl }),
      updatedAt: serverTimestamp(),
    });

    // 2. Update SUBCOLLECTION
    const subcollectionRef = doc(db, 'catalogues', catalogueId, 'offers', offerId);
    await updateDoc(subcollectionRef, updateData);
    console.log('✅ Subcollection updated');

    // 3. Update FLAT COLLECTION
    const flatRef = doc(db, 'offers', offerId);
    const flatDoc = await getDoc(flatRef);

    if (flatDoc.exists()) {
      await updateDoc(flatRef, updateData);
      console.log('✅ Flat collection updated');
    } else {
      console.warn('⚠️ Offer not found in flat collection, skipping update');
    }

    console.log('✅ Dual update complete');
  } catch (error) {
    console.error('❌ Error updating catalogue offer:', error);
    throw error;
  }
};

/**
 * Delete a catalogue offer (DUAL WRITE PATTERN)
 */
export const deleteCatalogueOffer = async (
  catalogueId: string,
  offerId: string,
  imageUrl?: string
): Promise<void> => {
  try {
    console.log(`🗑️ Deleting offer ${offerId} from catalogue ${catalogueId}`);

    // 1. Delete image from storage if URL provided
    if (imageUrl && imageUrl.includes('firebase')) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        console.log('✅ Offer image deleted from storage');
      } catch (error) {
        console.warn('⚠️ Could not delete offer image:', error);
      }
    }

    // 2. Delete from SUBCOLLECTION
    const subcollectionRef = doc(db, 'catalogues', catalogueId, 'offers', offerId);
    await deleteDoc(subcollectionRef);
    console.log('✅ Deleted from subcollection');

    // 3. Delete from FLAT COLLECTION
    const flatRef = doc(db, 'offers', offerId);
    await deleteDoc(flatRef);
    console.log('✅ Deleted from flat collection');

    console.log('✅ Dual delete complete');
  } catch (error) {
    console.error('❌ Error deleting catalogue offer:', error);
    throw error;
  }
};

/**
 * Sync existing offers to flat collection (one-time migration utility)
 */
export const syncOfferToFlatCollection = async (
  catalogueId: string,
  offerId: string
): Promise<void> => {
  try {
    console.log(`🔄 Syncing offer ${offerId} to flat collection`);

    // Get catalogue data
    const catalogueDoc = await getDoc(doc(db, 'catalogues', catalogueId));
    if (!catalogueDoc.exists()) {
      throw new Error(`Catalogue ${catalogueId} not found`);
    }
    const catalogue = catalogueDoc. data();

    // Get offer data from subcollection
    const offerDoc = await getDoc(doc(db, 'catalogues', catalogueId, 'offers', offerId));
    if (!offerDoc.exists()) {
      throw new Error(`Offer ${offerId} not found in subcollection`);
    }
    const offer = offerDoc.data();

    // Calculate isActive
    const endDate = catalogue.endDate instanceof Timestamp
      ? catalogue.endDate.toDate()
      : new Date(catalogue.endDate);
    const isActive = endDate >= new Date();

    // Write to flat collection
    const flatCollectionData = removeUndefinedFields({
      ...offer,
      id: offerId,
      catalogueId,
      storeId: catalogue.storeId,
      storeName: catalogue. storeName || catalogue.titleAr.replace('عروض ', ''),
      catalogueTitle: catalogue.titleAr,
      catalogueStartDate: catalogue.startDate,
      catalogueEndDate:  catalogue.endDate,
      isActive,
    });

    await setDoc(doc(db, 'offers', offerId), flatCollectionData);

    console.log('✅ Offer synced to flat collection');
  } catch (error) {
    console.error('❌ Error syncing offer:', error);
    throw error;
  }
};

/**
 * Sync all offers from a catalogue to flat collection (migration utility)
 */
export const syncAllCatalogueOffers = async (catalogueId: string): Promise<void> => {
  try {
    console.log(`🔄 Syncing all offers for catalogue ${catalogueId}`);

    const offers = await getCatalogueOffers(catalogueId);

    for (const offer of offers) {
      await syncOfferToFlatCollection(catalogueId, offer.id);
    }

    console.log(`✅ Synced ${offers.length} offers to flat collection`);
  } catch (error) {
    console.error('❌ Error syncing catalogue offers:', error);
    throw error;
  }
};

/**
 * Get offers count for a catalogue
 */
export const getCatalogueOffersCount = async (catalogueId: string): Promise<number> => {
  try {
    const offersRef = collection(db, 'catalogues', catalogueId, 'offers');
    const snapshot = await getDocs(offersRef);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error getting offers count:', error);
    return 0;
  }
};

/**
 * Get offers grouped by page number
 */
export const getOffersGroupedByPage = async (
  catalogueId: string
): Promise<Record<number, CatalogueOffer[]>> => {
  try {
    const offers = await getCatalogueOffers(catalogueId);

    const grouped:  Record<number, CatalogueOffer[]> = {};
    offers.forEach(offer => {
      if (!grouped[offer.pageNumber]) {
        grouped[offer.pageNumber] = [];
      }
      grouped[offer.pageNumber]. push(offer);
    });

    return grouped;
  } catch (error) {
    console.error('❌ Error grouping offers by page:', error);
    throw error;
  }
};

/**
 * Get all offers for a catalogue with their page information
 */
export const getCatalogueOffersWithPages = async (
  catalogueId:  string
): Promise<{ offers: CatalogueOffer[]; pageCount: number; offersByPage: Record<number, number> }> => {
  try {
    const offers = await getCatalogueOffers(catalogueId);

    // Calculate statistics
    const pageNumbers = [... new Set(offers.map(offer => offer.pageNumber))];
    const pageCount = Math.max(...pageNumbers, 0);

    const offersByPage:  Record<number, number> = {};
    offers.forEach(offer => {
      offersByPage[offer.pageNumber] = (offersByPage[offer.pageNumber] || 0) + 1;
    });

    return {
      offers,
      pageCount,
      offersByPage,
    };
  } catch (error) {
    console.error('❌ Error getting catalogue offers with pages:', error);
    throw error;
  }
};

/**
 * Delete all offers from a catalogue
 * WARNING: This is a destructive operation!
 */
export const deleteAllCatalogueOffers = async (catalogueId: string): Promise<void> => {
  try {
    console.log(`🗑️ Deleting all offers from catalogue ${catalogueId}`);

    const offers = await getCatalogueOffers(catalogueId);

    for (const offer of offers) {
      await deleteCatalogueOffer(catalogueId, offer.id, offer.imageUrl);
    }

    console.log(`✅ Deleted ${offers.length} offers from catalogue ${catalogueId}`);
  } catch (error) {
    console.error('❌ Error deleting all catalogue offers:', error);
    throw error;
  }
};