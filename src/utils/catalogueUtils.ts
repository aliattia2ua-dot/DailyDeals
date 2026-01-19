// src/utils/catalogueUtils.ts - UPDATED WITH CATEGORY HELPERS
import { Platform } from 'react-native';
import type { Catalogue, CataloguePage, Category } from '../types';
import {
  MAIN_CATEGORY_IDS,
  getCategoryById,
  getMainCategories
} from '../data/categories';

/**
 * Parse catalogue filename to extract metadata
 * Expected format: {storeName}_{startDate}_{endDate}.pdf
 * Example: kazyon_2025-12-23_2026-01-29.pdf
 */
export interface ParsedCatalogueInfo {
  storeName: string;
  storeNameAr: string;
  startDate: string;
  endDate: string;
  filename: string;
  isValid: boolean;
  suggestedCategoryId?: string; // NEW - Suggested main category based on store
}

// Store name mappings (English to Arabic)
const storeNameMappings: Record<string, string> = {
  'kazyon': 'كازيون',
  'carrefour': 'كارفور',
  'hyperone': 'هايبر وان',
  'spinneys': 'سبينيس',
  'metro': 'مترو',
  'oscar': 'أوسكار',
  'ragab': 'رجب أولاد رجب',
  'seoudi': 'سعودي',
  'awlad': 'أولاد رجب',
  'catalogue': 'كتالوج', // fallback for unknown
};

/**
 * NEW - Store to default category mapping
 * Maps stores to their primary category type
 */
const storeDefaultCategory: Record<string, string> = {
  'kazyon': MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  'carrefour': MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  'hyperone': MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  'spinneys': MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  'metro': MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  'oscar': MAIN_CATEGORY_IDS.ELECTRONICS,
  'b-tech': MAIN_CATEGORY_IDS.ELECTRONICS,
  'extra': MAIN_CATEGORY_IDS.ELECTRONICS,
  'noon': MAIN_CATEGORY_IDS.ELECTRONICS,
  'ikea': MAIN_CATEGORY_IDS.HOME,
  'home-center': MAIN_CATEGORY_IDS.HOME,
  'home-box': MAIN_CATEGORY_IDS.HOME,
  'centrepoint': MAIN_CATEGORY_IDS.FASHION,
  'stradivarius': MAIN_CATEGORY_IDS.FASHION,
  'zara': MAIN_CATEGORY_IDS.FASHION,
  'h&m': MAIN_CATEGORY_IDS.FASHION,
};

/**
 * Parse a catalogue filename
 */
export const parseCatalogueFilename = (filename: string): ParsedCatalogueInfo => {
  // Remove .pdf extension
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');

  // Try to parse: storeName_startDate_endDate
  // Regex to match: name_YYYY-MM-DD_YYYY-MM-DD or name_YYYY-M-D_YYYY-M-D
  const regex = /^([a-zA-Z0-9]+)_(\d{4}-\d{1,2}-\d{1,2})_(\d{4}-\d{1,2}-\d{1,2})$/;
  const match = nameWithoutExt.match(regex);

  if (match) {
    const [, storeName, startDate, endDate] = match;
    const normalizedStoreName = storeName.toLowerCase();

    return {
      storeName: normalizedStoreName,
      storeNameAr: storeNameMappings[normalizedStoreName] || storeName,
      startDate: normalizeDate(startDate),
      endDate: normalizeDate(endDate),
      filename,
      isValid: true,
      suggestedCategoryId: storeDefaultCategory[normalizedStoreName] || MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    };
  }

  // Fallback: try to extract any useful info
  // For files like: catalogue_92b7a97e_1765366806.pdf
  const parts = nameWithoutExt.split('_');
  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(today.getDate() + 7);

  return {
    storeName: parts[0] || 'unknown',
    storeNameAr: storeNameMappings[parts[0]?.toLowerCase()] || 'كتالوج',
    startDate: today.toISOString().split('T')[0],
    endDate: weekLater.toISOString().split('T')[0],
    filename,
    isValid: false,
    suggestedCategoryId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  };
};

/**
 * NEW - Get suggested category for a store
 */
export const getSuggestedCategoryForStore = (storeId: string): string => {
  const normalized = storeId.toLowerCase();
  return storeDefaultCategory[normalized] || MAIN_CATEGORY_IDS.FOOD_GROCERIES;
};

/**
 * NEW - Get category display name for catalogue
 */
export const getCategoryDisplayName = (categoryId?: string, language: 'ar' | 'en' = 'ar'): string => {
  if (!categoryId) return language === 'ar' ? 'غير محدد' : 'Not specified';

  const category = getCategoryById(categoryId);
  if (!category) return categoryId;

  return language === 'ar' ? category.nameAr : category.nameEn;
};

/**
 * NEW - Filter catalogues by main category
 */
export const filterCataloguesByCategory = (
  catalogues: Catalogue[],
  categoryId: string
): Catalogue[] => {
  return catalogues.filter(cat => cat.categoryId === categoryId);
};

/**
 * NEW - Group catalogues by category
 */
export const groupCataloguesByCategory = (
  catalogues: Catalogue[]
): Record<string, Catalogue[]> => {
  const mainCategories = getMainCategories();
  const grouped: Record<string, Catalogue[]> = {};

  // Initialize with empty arrays for all main categories
  mainCategories.forEach(cat => {
    grouped[cat.id] = [];
  });

  // Add 'uncategorized' for catalogues without category
  grouped['uncategorized'] = [];

  // Group catalogues
  catalogues.forEach(catalogue => {
    if (catalogue.categoryId && grouped[catalogue.categoryId]) {
      grouped[catalogue.categoryId].push(catalogue);
    } else {
      grouped['uncategorized'].push(catalogue);
    }
  });

  return grouped;
};

/**
 * Normalize date string to YYYY-MM-DD format
 */
const normalizeDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const [year, month, day] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Check if a catalogue is currently active
 */
export const isCatalogueActive = (startDate: string, endDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return today >= start && today <= end;
};

/**
 * Check if a catalogue is upcoming
 */
export const isCatalogueUpcoming = (startDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  return start > today;
};

/**
 * Check if a catalogue is expired
 */
export const isCatalogueExpired = (endDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return today > end;
};

/**
 * Get catalogue status
 */
export type CatalogueStatus = 'active' | 'upcoming' | 'expired';

export const getCatalogueStatus = (startDate: string, endDate: string): CatalogueStatus => {
  if (isCatalogueActive(startDate, endDate)) return 'active';
  if (isCatalogueUpcoming(startDate)) return 'upcoming';
  return 'expired';
};

/**
 * Create a Catalogue object from parsed info
 */
export const createCatalogueFromParsed = (
  parsed: ParsedCatalogueInfo,
  index: number
): Catalogue => {
  const pdfUrl = Platform.OS === 'web'
    ? `/catalogues/${parsed.filename}`
    : parsed.filename;

  return {
    id: `catalogue-${parsed.storeName}-${index}`,
    storeId: parsed.storeName,
    categoryId: parsed.suggestedCategoryId, // NEW - Add suggested category
    titleAr: `عروض ${parsed.storeNameAr}`,
    titleEn: `${parsed.storeName.charAt(0).toUpperCase() + parsed.storeName.slice(1)} Offers`,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    coverImage: `https://placehold.co/400x600/e63946/ffffff?text=${encodeURIComponent(parsed.storeNameAr)}`,
    pdfUrl,
    pages: [],
  };
};

/**
 * Format date for display (Arabic)
 */
export const formatDateAr = (dateStr: string): string => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('ar-EG', options);
};

/**
 * Format date range for display
 * @param startDate Start date string (YYYY-MM-DD)
 * @param endDate End date string (YYYY-MM-DD)
 * @returns Formatted date range in Arabic
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };

    const startStr = start.toLocaleDateString('ar-EG', options);
    const endStr = end.toLocaleDateString('ar-EG', options);

    return `${startStr} - ${endStr}`;
  } catch (error) {
    return `${startDate} - ${endDate}`;
  }
};

/**
 * Check if a date is today
 */
export const isToday = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Get days remaining until end date
 */
export const getDaysRemaining = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();

  end.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * NEW - Validate category ID
 */
export const isValidCategoryId = (categoryId: string): boolean => {
  return !!getCategoryById(categoryId);
};

/**
 * NEW - Get catalogues statistics by category
 */
export interface CatalogueStatsByCategory {
  categoryId: string;
  categoryName: string;
  total: number;
  active: number;
  upcoming: number;
  expired: number;
}

export const getCatalogueStatsByCategory = (
  catalogues: Catalogue[]
): CatalogueStatsByCategory[] => {
  const grouped = groupCataloguesByCategory(catalogues);
  const mainCategories = getMainCategories();

  return mainCategories.map(category => {
    const categoryCatalogues = grouped[category.id] || [];

    return {
      categoryId: category.id,
      categoryName: category.nameAr,
      total: categoryCatalogues.length,
      active: categoryCatalogues.filter(cat =>
        isCatalogueActive(cat.startDate, cat.endDate)
      ).length,
      upcoming: categoryCatalogues.filter(cat =>
        isCatalogueUpcoming(cat.startDate)
      ).length,
      expired: categoryCatalogues.filter(cat =>
        isCatalogueExpired(cat.endDate)
      ).length,
    };
  });
};