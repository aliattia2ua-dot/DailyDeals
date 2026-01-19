// src/config/firebase.ts - React Native Firebase (native SDK)
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';

// No config object needed - reads from google-services.json / GoogleService-Info.plist

// Export instances
export const db = firestore();
export const authInstance = auth();
export const storageInstance = storage();

// Crashlytics helpers
export const logError = (error: Error, context?: string) => {
  if (context) {
    crashlytics().log(context);
  }
  crashlytics().recordError(error);
};

export const logEvent = async (name: string, params?: Record<string, any>) => {
  await analytics().logEvent(name, params);
};

export const setUserId = async (userId: string) => {
  await crashlytics().setUserId(userId);
  await analytics().setUserId(userId);
};

// Legacy compatibility functions for existing code
export const initializeFirebase = async () => {
  console.log('✅ React Native Firebase initialized (native SDK)');
  return { 
    app: null, 
    auth: authInstance, 
    db, 
    storage: storageInstance, 
    analytics: null 
  };
};

export const getAuthInstance = () => authInstance;
export const getDbInstance = () => db;
export const getStorageInstance = () => storageInstance;
export const getAnalyticsInstance = () => null;

// Export types
export type { FirebaseAuthTypes, FirebaseFirestoreTypes };
export { auth, firestore, storage, crashlytics, analytics };