// src/config/firebase. ts - FIXED:  Proper web auth initialization + Analytics
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { Analytics } from 'firebase/analytics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For React Native persistence
import { getReactNativePersistence } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: Constants.expoConfig?. extra?. EXPO_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?. EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?. extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?. EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?. extra?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process. env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants. expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_APP_ID || process. env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: Constants. expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics:  Analytics | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize Firebase app and services with proper persistence
 */
export const initializeFirebase = async (): Promise<{
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  analytics: Analytics | null;
}> => {
  // If already initializing, wait for it to complete
  if (isInitializing && initializationPromise) {
    await initializationPromise;
    return { app:  app!, auth: auth!, db: db!, storage:  storage!, analytics };
  }

  // If already initialized, return existing instances
  if (app && auth && db && storage) {
    console.log('✅ Firebase already initialized, returning existing instances');
    return { app, auth, db, storage, analytics };
  }

  // Start initialization
  isInitializing = true;

  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing Firebase.. .');

      // Initialize Firebase App
      const existingApps = getApps();
      if (existingApps.length === 0) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
      } else {
        app = existingApps[0];
        console. log('✅ Using existing Firebase app');
      }

      // ✅ CRITICAL FIX: Initialize Auth differently for web vs native
      if (! auth) {
        if (Platform.OS === 'web') {
          try {
            auth = getAuth(app);
            console. log('✅ Firebase Auth initialized for web with getAuth()');
          } catch (error:  any) {
            console.error('❌ Error initializing web auth:', error);
            throw error;
          }
        } else {
          try {
            auth = initializeAuth(app, {
              persistence: getReactNativePersistence(AsyncStorage)
            });
            console.log('✅ Firebase Auth initialized for React Native with AsyncStorage persistence');
          } catch (error: any) {
            console. warn('⚠️ initializeAuth failed, falling back to getAuth:', error. message);
            auth = getAuth(app);
          }
        }
      }

      // Initialize Firestore with platform-specific settings
      if (!db) {
        if (Platform.OS === 'web') {
          try {
            db = initializeFirestore(app, {
              localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
              })
            });
            console.log('✅ Firestore initialized for web with persistent cache');
          } catch (error: any) {
            console. warn('⚠️ Persistent cache initialization failed, using default:', error.message);
            db = getFirestore(app);
          }
        } else {
          db = getFirestore(app);
          console.log('✅ Firestore initialized for native');
        }
      }

      // Initialize Storage
      if (! storage) {
        storage = getStorage(app);
        console.log('✅ Firebase Storage initialized');
      }

      // Initialize Analytics - WEB ONLY with proper checks
      if (Platform.OS === 'web' && firebaseConfig.measurementId) {
        try {
          const { getAnalytics, isSupported } = await import('firebase/analytics');
          const supported = await isSupported();
          if (supported) {
            analytics = getAnalytics(app);
            console.log('✅ Firebase Analytics initialized for web');
          } else {
            console.log('⚠️ Firebase Analytics not supported in this environment');
          }
        } catch (error: any) {
          console. warn('⚠️ Firebase Analytics initialization failed:', error.message);
        }
      } else if (Platform.OS !== 'web') {
        // For native, analytics will be handled by @react-native-firebase/analytics
        console.log('📱 Native analytics will use @react-native-firebase/analytics');
      }

      console.log('✅ All Firebase services initialized successfully');
    } catch (error) {
      console. error('❌ Error initializing Firebase:', error);
      app = null;
      auth = null;
      db = null;
      storage = null;
      analytics = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  await initializationPromise;
  return { app:  app!, auth: auth!, db: db!, storage: storage!, analytics };
};

/**
 * Get Firebase Auth instance
 */
export const getAuthInstance = (): Auth => {
  if (! auth) {
    throw new Error('Firebase Auth not initialized.  Call initializeFirebase first.');
  }
  return auth;
};

/**
 * Get Firestore instance
 */
export const getDbInstance = (): Firestore => {
  if (!db) {
    throw new Error('Firestore not initialized. Call initializeFirebase first.');
  }
  return db;
};

/**
 * Get Firebase Storage instance
 */
export const getStorageInstance = (): FirebaseStorage => {
  if (!storage) {
    throw new Error('Firebase Storage not initialized. Call initializeFirebase first.');
  }
  return storage;
};

/**
 * Get Firebase Analytics instance (web only)
 */
export const getAnalyticsInstance = (): Analytics | null => {
  return analytics;
};

// Export instances (will be null until initialized)
export { auth, db, storage, app, analytics };