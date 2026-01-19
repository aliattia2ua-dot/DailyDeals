// src/utils/imageHelpers.ts
import { Platform } from 'react-native';

/**
 * Converts an image URI to a Blob for upload
 * Handles both web and mobile URIs properly
 */
export const convertImageToBlob = async (uri: string): Promise<Blob> => {
  try {
    console.log('🖼️ Converting image to blob:', uri.substring(0, 50) + '...');
    
    // For web, use standard fetch
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('✅ Web blob created:', blob.size, 'bytes');
      return blob;
    }
    
    // For mobile (iOS/Android), use XMLHttpRequest for better compatibility
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 0) {
          console.log('✅ Mobile blob created:', xhr.response.size, 'bytes');
          resolve(xhr.response);
        } else {
          reject(new Error(`XHR failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = function() {
        console.error('❌ XHR error occurred');
        reject(new Error('Network error during image conversion'));
      };
      
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send();
    });
  } catch (error) {
    console.error('❌ Error converting image to blob:', error);
    throw new Error(`Failed to convert image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validates if a URI is a Firebase Storage URL
 */
export const isFirebaseStorageUrl = (uri: string): boolean => {
  return uri.includes('firebasestorage.googleapis.com') || 
         uri.includes('firebase.googleapis.com');
};

/**
 * Determines if an image needs to be uploaded (is a local URI)
 */
export const isLocalImageUri = (uri: string): boolean => {
  return uri.startsWith('file://') || 
         uri.startsWith('blob:') || 
         uri.startsWith('content://') || // Android content URIs
         (!isFirebaseStorageUrl(uri) && !uri.startsWith('http'));
};
