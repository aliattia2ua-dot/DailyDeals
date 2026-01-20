// src/config/firebase.ts - React Native Firebase (native SDK, Crashlytics Removed)
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import analytics from '@react-native-firebase/analytics';

// No config object needed - reads from google-services.json / GoogleService-Info.plist

// Export instances
export const db = firestore();
export const authInstance = auth();
export const storageInstance = storage();

// Error logging helper (console only, optionally sends to analytics)
export const logError = (error: Error, context?: string) => {
  const errorMessage = context ? `${context}: ${error.message}` : error.message;
  console.error(`🐛 [Firebase Error] ${errorMessage}`, error);

  // Optionally log to analytics as a custom event
  analytics().logEvent('app_error', {
    error_message: error.message,
    error_context: context || 'unknown',
    error_stack: error.stack?.substring(0, 100),
  }).catch(e => console.warn('⚠️ [Analytics] Failed to log error event:', e));
};

// Analytics event logging
export const logEvent = async (name: string, params?: Record<string, any>) => {
  await analytics().logEvent(name, params);
};

// Set user ID for analytics
export const setUserId = async (userId: string) => {
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
export { auth, firestore, storage, analytics };