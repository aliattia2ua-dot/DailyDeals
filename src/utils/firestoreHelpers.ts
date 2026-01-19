
// ============================================
// FILE 1: src/utils/firestoreHelpers.ts (NEW FILE)
// ============================================

import { Timestamp } from 'firebase/firestore';

/**
 * Convert Firestore Timestamp to ISO string
 */
export const serializeTimestamp = (timestamp: any): string | null => {
  if (!timestamp) return null;

  // Check if it's a Firestore Timestamp
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }

  // Check if it's already a string
  if (typeof timestamp === 'string') {
    return timestamp;
  }

  // Check if it's a Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  return null;
};

/**
 * Serialize a document from Firestore to remove non-serializable values
 */
export const serializeFirestoreDocument = <T extends Record<string, any>>(
  doc: T
): T => {
  const serialized: any = {};

  for (const [key, value] of Object.entries(doc)) {
    // Handle Timestamp objects
    if (value?.toDate && typeof value.toDate === 'function') {
      serialized[key] = value.toDate().toISOString();
    }
    // Handle nested objects
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      serialized[key] = serializeFirestoreDocument(value);
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      serialized[key] = value.map(item =>
        item && typeof item === 'object'
          ? serializeFirestoreDocument(item)
          : item
      );
    }
    // Handle primitive values
    else {
      serialized[key] = value;
    }
  }

  return serialized as T;
};

/**
 * Deserialize a timestamp string back to Date object
 */
export const deserializeTimestamp = (isoString: string | null): Date | null => {
  if (!isoString) return null;
  try {
    return new Date(isoString);
  } catch {
    return null;
  }
};

/**
 * Convert Firestore Timestamp to Date object
 */
export const timestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  if (timestamp instanceof Date) {
    return timestamp;
  }

  return null;
};
