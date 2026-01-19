// src/services/localAdminService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Catalogue } from '../types';

const LOCAL_CATALOGUES_KEY = 'local_catalogues';

export interface LocalCatalogueMetadata {
  id: string;
  titleAr: string;
  titleEn: string;
  storeId: string;
  storeName: string;
  startDate: string;
  endDate: string;
  pdfFileName: string;
  pdfUrl: string;
  createdAt: string;
  updatedAt: string;
}

const generateId = (): string => {
  return `catalogue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generatePdfFilename = (storeId: string, startDate: string, endDate: string): string => {
  const cleanStartDate = startDate.replace(/\//g, '-');
  const cleanEndDate = endDate.replace(/\//g, '-');
  return `${storeId}_${cleanStartDate}_${cleanEndDate}.pdf`;
};

export const getLocalCatalogues = async (): Promise<LocalCatalogueMetadata[]> => {
  try {
    const data = await AsyncStorage.getItem(LOCAL_CATALOGUES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting local catalogues:', error);
    return [];
  }
};

export const createLocalCatalogue = async (
  metadata: {
    titleAr: string;
    titleEn: string;
    storeId: string;
    storeName: string;
    startDate: string;
    endDate: string;
  },
  pdfFileName: string
): Promise<LocalCatalogueMetadata> => {
  try {
    const catalogues = await getLocalCatalogues();

    const newCatalogue: LocalCatalogueMetadata = {
      id: generateId(),
      titleAr: metadata.titleAr,
      titleEn: metadata.titleEn,
      storeId: metadata.storeId,
      storeName: metadata.storeName,
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      pdfFileName: pdfFileName,
      pdfUrl: `/catalogues/${pdfFileName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    catalogues.unshift(newCatalogue);
    await AsyncStorage.setItem(LOCAL_CATALOGUES_KEY, JSON.stringify(catalogues));

    console.log('[LocalAdmin] Catalogue created:', newCatalogue.id);
    return newCatalogue;
  } catch (error) {
    console.error('Error creating local catalogue:', error);
    throw error;
  }
};

export const deleteLocalCatalogue = async (catalogueId: string): Promise<void> => {
  try {
    const catalogues = await getLocalCatalogues();
    const filtered = catalogues.filter(c => c.id !== catalogueId);
    await AsyncStorage.setItem(LOCAL_CATALOGUES_KEY, JSON.stringify(filtered));
    console.log('[LocalAdmin] Catalogue deleted:', catalogueId);
  } catch (error) {
    console.error('Error deleting local catalogue:', error);
    throw error;
  }
};

export const convertToAppCatalogues = (localCatalogues: LocalCatalogueMetadata[]): Catalogue[] => {
  return localCatalogues.map(local => ({
    id: local.id,
    storeId: local.storeId,
    titleAr: local.titleAr,
    titleEn: local.titleEn,
    startDate: local.startDate,
    endDate: local.endDate,
    coverImage: '',
    pdfUrl: local.pdfUrl,
    pages: [],
  }));
};

export const getUploadInstructions = (pdfFileName: string): string => {
  return `PDF Upload Instructions:

1. Copy your PDF file to: public/catalogues/${pdfFileName}
2. Restart the development server: npm start
3. The catalogue will appear automatically

Note: The filename must be exactly: ${pdfFileName}`;
};

export const checkPdfExists = async (pdfFileName: string): Promise<boolean> => {
  if (Platform.OS !== 'web') {
    return true;
  }

  try {
    const response = await fetch(`/catalogues/${pdfFileName}`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

export const getRegistryUpdateCode = async (): Promise<string> => {
  const catalogues = await getLocalCatalogues();
  const fileNames = catalogues.map(c => `  '${c.pdfFileName}',`).join('\n');

  return `export const PDF_FILES: string[] = [\n${fileNames}\n];`;
};