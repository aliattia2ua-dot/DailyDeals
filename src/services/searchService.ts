// src/services/searchService.ts - Comprehensive Search Service with Local Store Names
import { getAllOffers, OfferWithCatalogue } from './offerService';
import { getCategoryById, getMainCategories, getMainSubcategories } from '../data/categories';
import type { Catalogue, Category, Store } from '../types';

export interface SearchResult {
  id: string;
  type: 'catalogue' | 'offer' | 'subcategory' | 'store';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageSource?: any; // NEW: For require() imported images like store logos
  data: Catalogue | OfferWithCatalogue | Category | Store;
  matchScore: number;
}

/**
 * Normalize Arabic text for better search matching
 * Removes diacritics and normalizes characters
 */
const normalizeArabicText = (text: string): string => {
  if (!text) return '';

  return text
    .toLowerCase()
    .trim()
    // Remove Arabic diacritics
    .replace(/[\u064B-\u065F]/g, '')
    // Normalize Alef variations
    .replace(/[آأإ]/g, 'ا')
    // Normalize Teh Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Yeh variations
    .replace(/ى/g, 'ي');
};

/**
 * Calculate match score based on how well the search query matches the text
 */
const calculateMatchScore = (text: string, query: string): number => {
  const normalizedText = normalizeArabicText(text);
  const normalizedQuery = normalizeArabicText(query);

  if (!normalizedQuery) return 0;

  // Exact match
  if (normalizedText === normalizedQuery) return 100;

  // Starts with query
  if (normalizedText.startsWith(normalizedQuery)) return 90;

  // Contains query as whole word
  const words = normalizedText.split(/\s+/);
  if (words.some(word => word === normalizedQuery)) return 80;

  // Contains query at start of any word
  if (words.some(word => word.startsWith(normalizedQuery))) return 70;

  // Contains query anywhere
  if (normalizedText.includes(normalizedQuery)) return 60;

  // Partial word matches
  const queryWords = normalizedQuery.split(/\s+/);
  const matchingWords = queryWords.filter(qWord =>
    words.some(tWord => tWord.includes(qWord))
  );

  if (matchingWords.length > 0) {
    return 50 * (matchingWords.length / queryWords.length);
  }

  return 0;
};

/**
 * Get display name for catalogue
 * Handles local stores with specific names
 */
const getCatalogueDisplayName = (catalogue: Catalogue, store: Store | undefined): string => {
  // For local stores with specific local store name
  if (catalogue.isLocalStore && catalogue.localStoreNameAr && catalogue.localStoreNameId !== 'unidentified') {
    return catalogue.localStoreNameAr;
  }

  // For unidentified local stores
  if (catalogue.isLocalStore && catalogue.localStoreNameId === 'unidentified') {
    const governorate = catalogue.localStoreGovernorate || '';
    const city = catalogue.localStoreCity || '';

    if (city) {
      return `${store?.nameAr || catalogue.storeName} - ${city}`;
    }

    if (governorate) {
      return `${store?.nameAr || catalogue.storeName} - ${governorate}`;
    }

    return store?.nameAr || catalogue.storeName || 'متجر محلي';
  }

  // For regular stores, use store name
  return store?.nameAr || catalogue.storeName || catalogue.titleAr;
};

/**
 * Search catalogues by name/title
 * Minimum 3 characters required
 */
export const searchCatalogues = async (
  catalogues: Catalogue[],
  stores: Store[],
  query: string
): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 3) return [];

  const results: SearchResult[] = [];

  catalogues.forEach(catalogue => {
    const store = stores.find(s => s.id === catalogue.storeId);
    const displayName = getCatalogueDisplayName(catalogue, store);

    // Search in catalogue title (Arabic)
    const titleScore = calculateMatchScore(catalogue.titleAr, query);

    // Search in catalogue title (English)
    let titleEnScore = 0;
    if (catalogue.titleEn) {
      titleEnScore = calculateMatchScore(catalogue.titleEn, query);
    }

    // Search in display name (store name or local store name)
    const displayNameScore = calculateMatchScore(displayName, query);

    // Search in store name (Arabic)
    let storeNameScore = 0;
    if (store?.nameAr) {
      storeNameScore = calculateMatchScore(store.nameAr, query);
    }

    // Search in store name (English)
    let storeNameEnScore = 0;
    if (store?.nameEn) {
      storeNameEnScore = calculateMatchScore(store.nameEn, query);
    }

    // Search in local store name specifically (Arabic)
    let localStoreScore = 0;
    if (catalogue.isLocalStore && catalogue.localStoreNameAr) {
      localStoreScore = calculateMatchScore(catalogue.localStoreNameAr, query);
    }

    // Search in local store name (English)
    let localStoreEnScore = 0;
    if (catalogue.isLocalStore && catalogue.localStoreNameEn) {
      localStoreEnScore = calculateMatchScore(catalogue.localStoreNameEn, query);
    }

    // Search in governorate name for local stores
    let governorateScore = 0;
    if (catalogue.isLocalStore && catalogue.localStoreGovernorate) {
      governorateScore = calculateMatchScore(catalogue.localStoreGovernorate, query);
    }

    // Search in city name for local stores
    let cityScore = 0;
    if (catalogue.isLocalStore && catalogue.localStoreCity) {
      cityScore = calculateMatchScore(catalogue.localStoreCity, query);
    }

    const maxScore = Math.max(
      titleScore,
      titleEnScore,
      displayNameScore,
      storeNameScore,
      storeNameEnScore,
      localStoreScore,
      localStoreEnScore,
      governorateScore,
      cityScore
    );

    if (maxScore > 0) {
      results.push({
        id: catalogue.id,
        type: 'catalogue',
        title: displayName,
        subtitle: `${catalogue.startDate} - ${catalogue.endDate}`,
        imageUrl: catalogue.coverImage,
        data: catalogue,
        matchScore: maxScore,
      });
    }
  });

  return results.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Search offers by name
 * Minimum 3 characters required
 */
export const searchOffers = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 3) return [];

  const allOffers = await getAllOffers();
  const results: SearchResult[] = [];

  allOffers.forEach(offer => {
    // Search in Arabic name
    const nameArScore = calculateMatchScore(offer.nameAr, query);

    // Search in English name
    const nameEnScore = offer.nameEn
      ? calculateMatchScore(offer.nameEn, query)
      : 0;

    const maxScore = Math.max(nameArScore, nameEnScore);

    if (maxScore > 0) {
      results.push({
        id: offer.id,
        type: 'offer',
        title: offer.nameAr,
        subtitle: `${offer.storeName} • ${offer.offerPrice} جنيه`,
        imageUrl: offer.imageUrl,
        data: offer,
        matchScore: maxScore,
      });
    }
  });

  return results.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Search stores by name (including local store names from catalogues)
 * Minimum 3 characters required
 */
export const searchStores = (
  stores: Store[],
  query: string,
  catalogues?: Catalogue[]
): SearchResult[] => {
  if (!query || query.trim().length < 3) return [];

  const results: SearchResult[] = [];
  const addedStores = new Set<string>(); // Track stores we've already added

  stores.forEach(store => {
    // Search in Arabic name
    const nameArScore = calculateMatchScore(store.nameAr, query);

    // Search in English name
    const nameEnScore = store.nameEn
      ? calculateMatchScore(store.nameEn, query)
      : 0;

    let maxScore = Math.max(nameArScore, nameEnScore);

    // For local stores, also search in local store names from catalogues
    if (store.isLocal && catalogues) {
      const localStoreCatalogues = catalogues.filter(
        cat => cat.storeId === store.id && cat.isLocalStore && cat.localStoreNameAr
      );

      // Search through all unique local store names for this store
      const localStoreNames = new Set<string>();
      localStoreCatalogues.forEach(cat => {
        if (cat.localStoreNameAr) localStoreNames.add(cat.localStoreNameAr);
        if (cat.localStoreNameEn) localStoreNames.add(cat.localStoreNameEn);
      });

      // Calculate match scores for local store names
      localStoreNames.forEach(localName => {
        const localScore = calculateMatchScore(localName, query);
        maxScore = Math.max(maxScore, localScore);
      });

      // If we found a match in local store names, enhance the subtitle
      if (maxScore > Math.max(nameArScore, nameEnScore) && maxScore > 0) {
        const matchingLocalStores = Array.from(localStoreNames)
          .filter(name => calculateMatchScore(name, query) > 0)
          .slice(0, 2) // Show up to 2 matching local stores
          .join(' • ');

        results.push({
          id: store.id,
          type: 'store',
          title: store.nameAr,
          subtitle: matchingLocalStores || `${store.branches?.length || 0} ${(store.branches?.length || 0) === 1 ? 'فرع' : 'فروع'}`,
          imageSource: store.logo, // Use imageSource for require() imported logos
          data: store,
          matchScore: maxScore,
        });
        addedStores.add(store.id);
        return;
      }
    }

    if (maxScore > 0 && !addedStores.has(store.id)) {
      results.push({
        id: store.id,
        type: 'store',
        title: store.nameAr,
        subtitle: `${store.branches?.length || 0} ${(store.branches?.length || 0) === 1 ? 'فرع' : 'فروع'}`,
        imageSource: store.logo, // Use imageSource for require() imported logos
        data: store,
        matchScore: maxScore,
      });
      addedStores.add(store.id);
    }
  });

  return results.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Search subcategories by name
 * Minimum 3 characters required
 */
export const searchSubcategories = (query: string): SearchResult[] => {
  if (!query || query.trim().length < 3) return [];

  const allSubcategories = getMainSubcategories();
  const results: SearchResult[] = [];

  allSubcategories.forEach(subcategory => {
    // Search in Arabic name
    const nameArScore = calculateMatchScore(subcategory.nameAr, query);

    // Search in English name
    const nameEnScore = calculateMatchScore(subcategory.nameEn, query);

    const maxScore = Math.max(nameArScore, nameEnScore);

    if (maxScore > 0) {
      // Get parent category name
      const parentCategory = subcategory.parentId
        ? getCategoryById(subcategory.parentId)
        : null;

      results.push({
        id: subcategory.id,
        type: 'subcategory',
        title: subcategory.nameAr,
        subtitle: parentCategory ? `${parentCategory.nameAr}` : undefined,
        data: subcategory,
        matchScore: maxScore,
      });
    }
  });

  return results.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Comprehensive search across all types
 * Minimum 3 characters required
 */
export const searchAll = async (
  catalogues: Catalogue[],
  stores: Store[],
  query: string
): Promise<{
  catalogues: SearchResult[];
  offers: SearchResult[];
  subcategories: SearchResult[];
  stores: SearchResult[];
  all: SearchResult[];
}> => {
  if (!query || query.trim().length < 3) {
    return {
      catalogues: [],
      offers: [],
      subcategories: [],
      stores: [],
      all: [],
    };
  }

  // Run all searches in parallel, passing catalogues to store search
  const [catalogueResults, offerResults, subcategoryResults, storeResults] = await Promise.all([
    searchCatalogues(catalogues, stores, query),
    searchOffers(query),
    Promise.resolve(searchSubcategories(query)),
    Promise.resolve(searchStores(stores, query, catalogues)), // Pass catalogues here
  ]);

  // Combine all results
  const allResults = [
    ...catalogueResults,
    ...offerResults,
    ...subcategoryResults,
    ...storeResults,
  ].sort((a, b) => b.matchScore - a.matchScore);

  return {
    catalogues: catalogueResults,
    offers: offerResults,
    subcategories: subcategoryResults,
    stores: storeResults,
    all: allResults,
  };
};

/**
 * Get search suggestions (top results for quick display)
 */
export const getSearchSuggestions = async (
  catalogues: Catalogue[],
  stores: Store[],
  query: string,
  limit: number = 5
): Promise<SearchResult[]> => {
  const results = await searchAll(catalogues, stores, query);
  return results.all.slice(0, limit);
};