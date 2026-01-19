// src/services/userDataService.ts - FIXED WITH PROPER LOCATION SYNC
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDbInstance } from '../config/firebase';
import { BasketItem, FavoritesState } from '../types';

/**
 * Sync user favorites to Firestore
 */
export const syncFavoritesToFirestore = async (
  uid: string,
  favorites: FavoritesState
): Promise<void> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      favorites:  {
        subcategoryIds: favorites.subcategoryIds,
        storeIds: favorites.storeIds,
      },
      updatedAt: serverTimestamp(),
    });

    console.log('✅ [userDataService] Favorites synced to Firestore');
  } catch (error) {
    console. error('❌ [userDataService] Error syncing favorites to Firestore:', error);
    throw error;
  }
};

/**
 * Get user favorites from Firestore
 */
export const getFavoritesFromFirestore = async (
  uid: string
): Promise<FavoritesState | null> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap. data().favorites) {
      const data = userSnap. data().favorites;
      return {
        subcategoryIds: data.subcategoryIds || [],
        storeIds: data.storeIds || [],
      };
    }

    return null;
  } catch (error) {
    console.error('❌ [userDataService] Error getting favorites from Firestore:', error);
    return null;
  }
};

/**
 * Sync user basket to Firestore
 */
export const syncBasketToFirestore = async (
  uid: string,
  basketItems: BasketItem[]
): Promise<void> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      basket: basketItems,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ [userDataService] Basket synced to Firestore');
  } catch (error) {
    console. error('❌ [userDataService] Error syncing basket to Firestore:', error);
    throw error;
  }
};

/**
 * Get user basket from Firestore
 */
export const getBasketFromFirestore = async (
  uid: string
): Promise<BasketItem[]> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().basket) {
      return userSnap.data().basket as BasketItem[];
    }

    return [];
  } catch (error) {
    console.error('❌ [userDataService] Error getting basket from Firestore:', error);
    return [];
  }
};

/**
 * Clear user basket in Firestore
 */
export const clearBasketInFirestore = async (uid: string): Promise<void> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      basket: [],
      updatedAt: serverTimestamp(),
    });

    console.log('✅ [userDataService] Basket cleared in Firestore');
  } catch (error) {
    console.error('❌ [userDataService] Error clearing basket in Firestore:', error);
    throw error;
  }
};

// ============================================
// LOCATION & PHONE SYNC FUNCTIONS
// ============================================

/**
 * Sync user location WITH phone number to Firestore
 * FIXED:  Handles null values properly and creates document if needed
 */
export const syncLocationToFirestore = async (
  uid:  string,
  governorate: string | null,
  city: string | null = null,
  phoneNumber?:  string | null
): Promise<void> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);

    // Check if document exists
    const userSnap = await getDoc(userRef);

    const locationData = {
      governorate:  governorate,
      city: city,
    };

    const updateData: any = {
      location: locationData,
      updatedAt:  serverTimestamp(),
    };

    // Only update phone if provided (not undefined)
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
    }

    if (userSnap. exists()) {
      // Update existing document
      await updateDoc(userRef, updateData);
      console.log('✅ [userDataService] Location updated in Firestore:', locationData);
    } else {
      // Create new document with location
      await setDoc(userRef, {
        ... updateData,
        createdAt: serverTimestamp(),
      });
      console.log('✅ [userDataService] Location created in Firestore:', locationData);
    }
  } catch (error) {
    console. error('❌ [userDataService] Error syncing location to Firestore:', error);
    throw error;
  }
};

/**
 * Get user location from Firestore
 */
export const getLocationFromFirestore = async (
  uid: string
): Promise<{ governorate:  string | null; city: string | null } | null> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().location) {
      const data = userSnap.data().location;
      return {
        governorate:  data.governorate || null,
        city: data.city || null,
      };
    }

    return null;
  } catch (error) {
    console. error('❌ [userDataService] Error getting location from Firestore:', error);
    return null;
  }
};

/**
 * Update user profile information
 */
export const updateUserProfile = async (
  uid:  string,
  data: {
    displayName?:  string | null;
    phoneNumber?: string | null;
  }
): Promise<void> => {
  try {
    const db = getDbInstance();
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      ... data,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ [userDataService] User profile updated in Firestore');
  } catch (error) {
    console.error('❌ [userDataService] Error updating user profile:', error);
    throw error;
  }
};

// ============================================
// COMBINED SYNC FUNCTIONS
// ============================================

/**
 * Sync all user data to Firestore
 */
export const syncAllUserData = async (
  uid: string,
  favorites: FavoritesState,
  basketItems: BasketItem[]
): Promise<void> => {
  try {
    await Promise.all([
      syncFavoritesToFirestore(uid, favorites),
      syncBasketToFirestore(uid, basketItems),
    ]);

    console.log('✅ [userDataService] All user data synced to Firestore');
  } catch (error) {
    console. error('❌ [userDataService] Error syncing all user data:', error);
    throw error;
  }
};

/**
 * Get all user data from Firestore
 */
export const getAllUserData = async (
  uid: string
): Promise<{ favorites: FavoritesState | null; basket: BasketItem[] }> => {
  try {
    const [favorites, basket] = await Promise.all([
      getFavoritesFromFirestore(uid),
      getBasketFromFirestore(uid),
    ]);

    return { favorites, basket };
  } catch (error) {
    console.error('❌ [userDataService] Error getting all user data:', error);
    return {
      favorites: null,
      basket:  [],
    };
  }
};