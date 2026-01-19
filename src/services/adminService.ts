// src/services/adminService.ts
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Catalogue } from '../types';

export interface CatalogueMetadata {
  titleAr: string;
  titleEn: string;
  storeId: string;
  storeName: string;
  startDate: string;
  endDate: string;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

/**
 * Create a new catalogue entry in Firestore
 * NOTE: This is now simplified - the actual upload and conversion
 * happens in CatalogueUploadForm.tsx
 */
export const createCatalogue = async (
  metadata: CatalogueMetadata,
  pdfUrl: string | null,
  coverImageUrl: string,
  pages: Array<{ pageNumber: number; imageUrl: string; offers?: string[] }>
): Promise<string> => {
  try {
    const catalogueData: any = {
      storeId: metadata.storeId,
      storeName: metadata.storeName,
      titleAr: metadata.titleAr,
      titleEn: metadata.titleEn,
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      coverImage: coverImageUrl,
      pages: pages,
      totalPages: pages.length,
      pdfProcessed: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add pdfUrl if it exists (PDF upload case)
    if (pdfUrl) {
      catalogueData.pdfUrl = pdfUrl;
    }

    const docRef = await addDoc(collection(db, 'catalogues'), catalogueData);
    console.log('✅ Catalogue created with ID:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating catalogue:', error);
    throw error;
  }
};

/**
 * Delete a catalogue and ALL its associated files
 * This properly handles both PDF and image-only uploads
 */
export const deleteCatalogue = async (
  catalogueId: string,
  pdfUrl?: string
): Promise<void> => {
  try {
    console.log('🗑️ Starting catalogue deletion:', catalogueId);
    console.log('   PDF URL provided:', pdfUrl ? 'Yes' : 'No');

    const deletionResults = {
      firestore: false,
      pdf: false,
      cover: false,
      pages: 0,
      offers: 0,
    };

    // STEP 1: Delete from Firestore
    // IMPORTANT: We need to find the document by matching the 'id' field, not the document ID
    try {
      console.log('🔍 Searching for catalogue document...');
      const cataloguesRef = collection(db, 'catalogues');
      const querySnapshot = await getDocs(cataloguesRef);

      let docToDelete = null;
      querySnapshot.forEach((document) => {
        const data = document.data();
        if (data.id === catalogueId) {
          docToDelete = document.ref;
          console.log('📍 Found document with Firestore ID:', document.id);
        }
      });

      if (docToDelete) {
        await deleteDoc(docToDelete);
        deletionResults.firestore = true;
        console.log('✅ [1/7] Firestore document deleted');
      } else {
        console.warn('⚠️ [1/7] Document not found in Firestore');
        // Still continue to clean up storage files
      }
    } catch (error: any) {
      console.error('❌ Error deleting Firestore document:', error.message);
      throw new Error(`Failed to delete catalogue document: ${error.message}`);
    }

    // STEP 2: Delete PDF file (if exists)
    if (pdfUrl && pdfUrl.includes('firebase')) {
      try {
        const pdfRef = ref(storage, `catalogues/${catalogueId}.pdf`);
        await deleteObject(pdfRef);
        deletionResults.pdf = true;
        console.log('✅ [2/5] PDF file deleted');
      } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
          console.log('⚠️ [2/5] PDF file not found (already deleted or never existed)');
        } else {
          console.warn('⚠️ [2/5] Error deleting PDF:', error.message);
        }
      }
    } else {
      console.log('⏭️ [2/5] No PDF to delete (image-only upload)');
    }

    // STEP 3: Delete cover image
    try {
      const coverRef = ref(storage, `catalogue-covers/${catalogueId}.jpg`);
      await deleteObject(coverRef);
      deletionResults.cover = true;
      console.log('✅ [3/5] Cover image deleted');
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.log('⚠️ [3/5] Cover image not found');
      } else {
        console.warn('⚠️ [3/5] Error deleting cover:', error.message);
      }
    }

    // STEP 4: Delete all page images from catalogue-pages folder
    try {
      const pagesRef = ref(storage, `catalogue-pages/${catalogueId}`);
      const pagesList = await listAll(pagesRef);

      if (pagesList.items.length > 0) {
        await Promise.all(
          pagesList.items.map(item => deleteObject(item))
        );
        deletionResults.pages = pagesList.items.length;
        console.log(`✅ [4/5] Deleted ${pagesList.items.length} page images`);
      } else {
        console.log('⚠️ [4/5] No page images found');
      }
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.log('⚠️ [4/5] Page images folder not found');
      } else {
        console.warn('⚠️ [4/5] Error deleting page images:', error.message);
      }
    }

    // STEP 5: Delete all offer images from catalogue-offers folder
    try {
      const offersRef = ref(storage, `catalogue-offers/${catalogueId}`);
      const offersList = await listAll(offersRef);

      if (offersList.items.length > 0) {
        await Promise.all(
          offersList.items.map(item => deleteObject(item))
        );
        deletionResults.offers = offersList.items.length;
        console.log(`✅ [5/5] Deleted ${offersList.items.length} offer images`);
      } else {
        console.log('⚠️ [5/5] No offer images found');
      }
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.log('⚠️ [5/5] Offer images folder not found');
      } else {
        console.warn('⚠️ [5/5] Error deleting offer images:', error.message);
      }
    }

    // STEP 6: Delete all offers from flat collection (by catalogueId field)
    try {
      const flatOffersQuery = query(
        collection(db, 'offers'),
        where('catalogueId', '==', catalogueId)
      );
      const flatOffersSnapshot = await getDocs(flatOffersQuery);

      if (!flatOffersSnapshot.empty) {
        await Promise.all(
          flatOffersSnapshot.docs.map(doc => deleteDoc(doc.ref))
        );
        console.log(`✅ [6/7] Deleted ${flatOffersSnapshot.size} offers from flat collection`);
      } else {
        console.log('⚠️ [6/7] No offers found in flat collection');
      }
    } catch (error: any) {
      console.warn('⚠️ [6/7] Error deleting offers from flat collection:', error.message);
    }

    // STEP 7: Delete all offers from subcollection (need to find parent doc first)
    try {
      const cataloguesRef = collection(db, 'catalogues');
      const querySnapshot = await getDocs(cataloguesRef);

      let parentDocId = null;
      querySnapshot.forEach((document) => {
        const data = document.data();
        if (data.id === catalogueId) {
          parentDocId = document.id;
        }
      });

      if (parentDocId) {
        const offersRef = collection(db, 'catalogues', parentDocId, 'offers');
        const offersSnapshot = await getDocs(offersRef);

        if (!offersSnapshot.empty) {
          await Promise.all(
            offersSnapshot.docs.map(doc => deleteDoc(doc.ref))
          );
          console.log(`✅ [7/7] Deleted ${offersSnapshot.size} offers from subcollection`);
        } else {
          console.log('⚠️ [7/7] No offers found in subcollection');
        }
      } else {
        console.log('⚠️ [7/7] Parent document not found, skipping subcollection');
      }
    } catch (error: any) {
      console.warn('⚠️ [7/7] Error deleting offers subcollection:', error.message);
    }

    console.log('🎉 Catalogue deletion complete!');
    console.log('📊 Deletion Summary:', {
      firestoreDoc: deletionResults.firestore ? '✅' : '❌',
      pdfFile: pdfUrl ? (deletionResults.pdf ? '✅' : '⚠️') : '⏭️ N/A',
      coverImage: deletionResults.cover ? '✅' : '⚠️',
      pageImages: `${deletionResults.pages} deleted`,
      offerImages: `${deletionResults.offers} deleted`,
    });

  } catch (error) {
    console.error('❌ Critical error during catalogue deletion:', error);
    throw error;
  }
};

/**
 * Get all catalogues from Firestore
 */
export const getAllCatalogues = async (): Promise<Catalogue[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'catalogues'));

    const catalogues: Catalogue[] = [];
    querySnapshot.forEach((doc) => {
      catalogues.push({
        id: doc.id,
        ...doc.data(),
      } as Catalogue);
    });

    console.log(`📚 Fetched ${catalogues.length} catalogues from Firestore`);
    return catalogues;
  } catch (error) {
    console.error('❌ Error fetching catalogues:', error);
    throw error;
  }
};

/**
 * Upload a blob/file to Firebase Storage
 * Generic helper function
 */
export const uploadFileToStorage = async (
  path: string,
  file: Blob | File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

/**
 * Get catalogue by ID
 */
export const getCatalogueById = async (catalogueId: string): Promise<Catalogue | null> => {
  try {
    const docRef = doc(db, 'catalogues', catalogueId);
    const docSnap = await getDocs(collection(db, 'catalogues'));

    const catalogue = docSnap.docs.find(d => d.id === catalogueId);

    if (catalogue) {
      return {
        id: catalogue.id,
        ...catalogue.data(),
      } as Catalogue;
    }

    return null;
  } catch (error) {
    console.error('❌ Error fetching catalogue:', error);
    throw error;
  }
};