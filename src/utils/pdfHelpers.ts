// src/utils/pdfHelpers.ts
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Paths, File } from 'expo-file-system';
import { getPdfAsset, isPdfRegistered } from '../assets/pdfRegistry';

/**
 * Resolves PDF URL for both web and native platforms
 * @param pdfUrl - The PDF URL or filename
 * @returns Promise<string> - The resolved PDF URL
 */
export const resolvePdfUrl = async (pdfUrl: string): Promise<string> => {
  if (Platform.OS === 'web') {
    // Web can use the URL directly
    return pdfUrl;
  }

  // For native platforms, we need to load the asset
  try {
    // Check if it's already a full URL
    if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
      return pdfUrl;
    }

    // It's a local asset filename - use the registry
    const assetModule = getPdfAsset(pdfUrl);
    
    if (!assetModule) {
      throw new Error(`PDF asset not found in registry: ${pdfUrl}. Please add it to src/assets/pdfRegistry.ts`);
    }

    const asset = Asset.fromModule(assetModule);
    
    await asset.downloadAsync();
    
    if (asset.localUri) {
      return asset.localUri;
    }

    throw new Error('Failed to load PDF asset');
  } catch (error) {
    console.error('Error resolving PDF URL:', error);
    throw error;
  }
};

/**
 * Alternative method: Copy PDF to cache directory for better control
 * @param filename - The PDF filename
 * @returns Promise<string> - The local file URI
 */
export const copyPdfToCache = async (filename: string): Promise<string> => {
  if (Platform.OS === 'web') {
    return `/assets/catalogues/${filename}`;
  }

  try {
    const assetModule = getPdfAsset(filename);
    
    if (!assetModule) {
      throw new Error(`PDF asset not found in registry: ${filename}. Please add it to src/assets/pdfRegistry.ts`);
    }

    const asset = Asset.fromModule(assetModule);
    
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error('Asset download failed');
    }

    // Copy to cache directory for better access
    const cachedFile = new File(Paths.cache, filename);

    if (!cachedFile.exists) {
      const sourceFile = new File(asset.localUri);
      sourceFile.copy(cachedFile);
    }

    return cachedFile.uri;
  } catch (error) {
    console.error('Error copying PDF to cache:', error);
    throw error;
  }
};

/**
 * Check if PDF file exists
 * @param pdfUrl - The PDF URL
 * @returns Promise<boolean>
 */
export const checkPdfExists = async (pdfUrl: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  try {
    const resolvedUrl = await resolvePdfUrl(pdfUrl);
    const file = new File(resolvedUrl);
    return file.exists;
  } catch {
    return false;
  }
};