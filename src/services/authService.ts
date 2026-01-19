// src/services/authService.ts - ✅ COMPLETE FILE WITH PHONE NUMBER SUPPORT
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { logError } from '../config/firebase';
import { UserProfile } from '../types';

type FirebaseUser = FirebaseAuthTypes.User;
type UserCredential = FirebaseAuthTypes.UserCredential;

// ============================================
// ADMIN CONFIGURATION
// ============================================

const ADMIN_EMAILS = [
  'aliattia2@gmail.com',
  'aliattia02@gmail.com',
  'asmaahassan9496@gmail.com',
  'aliattia2de@gmail.com'
];

const isAdminEmail = (email: string | null): boolean => {
  if (!email) return false;
  const emailLower = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(adminEmail =>
    adminEmail.toLowerCase().trim() === emailLower
  );
};

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export const signInWithGoogleToken = async (
  idToken: string | null,
  accessToken: string | null
): Promise<UserProfile | null> => {
  try {
    console.log('=== AUTH SERVICE ===');
    console.log('Signing in...');

    if (!idToken && !accessToken) {
      throw new Error('No authentication token provided');
    }

    const credential = auth.GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
    const userCredential: UserCredential = await auth().signInWithCredential(credential);
    const user = userCredential.user;

    console.log('✅ Firebase sign-in successful:', user.email);

    // ✅ Wait a moment for Firestore to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    const userProfile = await getOrCreateUserProfile(user);

    if (userProfile.isAdmin) {
      console.log('⭐ Admin user logged in:', user.email);
    } else {
      console.log('👤 Regular user logged in:', user.email);
    }

    return userProfile;
  } catch (error: any) {
    console.error('❌ Error signing in with Google:', error);
    logError(error, 'signInWithGoogleToken');
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await auth().signOut();
    console.log('✅ User signed out successfully');
  } catch (error) {
    console.error('❌ Error signing out:', error);
    logError(error as Error, 'signOut');
    throw error;
  }
};

/**
 * ✅ Get or create user profile - UPDATED WITH PHONE NUMBER
 */
export const getOrCreateUserProfile = async (
  user: FirebaseUser
): Promise<UserProfile> => {
  const maxRetries = 5;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Attempt ${attempt}/${maxRetries}: Getting user profile`);

      const userRef = firestore().collection('users').doc(user.uid);
      const userSnap = await userRef.get();

      const shouldBeAdmin = isAdminEmail(user.email);

      if (userSnap.exists) {
        console.log('✅ User profile found');

        const userData = userSnap.data();

        const updateData: any = {
          lastLoginAt: firestore.FieldValue.serverTimestamp()
        };

        if (shouldBeAdmin !== userData?.isAdmin) {
          updateData.isAdmin = shouldBeAdmin;

          if (shouldBeAdmin) {
            console.log('⭐ User promoted to admin (whitelist match)');
          } else {
            console.warn('⚠️ Admin privileges removed (not in whitelist)');
          }
        }

        await userRef.set(updateData, { merge: true });

        // ✅ Safely extract location with null checks
        const location = userData?.location ? {
          governorate: userData.location.governorate || null,
          city: userData.location.city || null,
        } : null;

        console.log('📍 User location from Firestore:', location);

        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: shouldBeAdmin,
          phoneNumber: userData?.phoneNumber || null, // ✅ NEW
          location: location || undefined,
          createdAt: userData?.createdAt,
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
        };
      } else {
        console.log('🆕 Creating new user profile');

        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: shouldBeAdmin,
          phoneNumber: null, // ✅ NEW
          location: undefined,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
        };

        await userRef.set(newProfile);

        if (shouldBeAdmin) {
          console.log('⭐ New admin user created');
        } else {
          console.log('✅ New regular user created');
        }

        return newProfile;
      }
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      logError(error, `getOrCreateUserProfile attempt ${attempt}`);

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to get/create user profile');
};

/**
 * ✅ Get user profile - UPDATED WITH PHONE NUMBER
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = firestore().collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const userData = userSnap.data();
      const shouldBeAdmin = isAdminEmail(userData?.email);

      // ✅ Safely extract location with null checks
      const location = userData?.location ? {
        governorate: userData.location.governorate || null,
        city: userData.location.city || null,
      } : null;

      console.log('📍 User location from Firestore:', location);

      return {
        uid,
        email: userData?.email,
        displayName: userData?.displayName,
        photoURL: userData?.photoURL,
        isAdmin: shouldBeAdmin,
        phoneNumber: userData?.phoneNumber || null, // ✅ NEW
        location: location || undefined,
        createdAt: userData?.createdAt,
        lastLoginAt: userData?.lastLoginAt,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    logError(error as Error, 'getUserProfile');
    return null;
  }
};

export const onAuthChange = (callback: (user: UserProfile | null) => void) => {
  return auth().onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userProfile = await getUserProfile(firebaseUser.uid);
        callback(userProfile);
      } catch (error) {
        console.error('❌ Error in auth change listener:', error);
        logError(error as Error, 'onAuthChange');
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

export const checkIsAdmin = (email: string | null): boolean => {
  return isAdminEmail(email);
};