// src/data/catalogueRegistry. ts
import { Catalogue } from '../types';
import { getAllCatalogues } from '../services/catalogueService';

// Cache for catalogues loaded from Firestore
let cataloguesCache: Catalogue[] = [];
let lastFetchTime:  number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CatalogueWithStatus extends Catalogue {
  status: 'active' | 'upcoming' | 'expired';
  parsedInfo: {
    storeName: string;
    storeNameAr: string;
    startDate: string;
    endDate: string;
  };
}

/**
 * Load catalogues from Firestore
 */
export const loadCataloguesFromFirestore = async (): Promise<Catalogue[]> => {
  const now = Date.now();

  // Return cached data if still valid
  if (cataloguesCache.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('📚 Using cached catalogues:', cataloguesCache.length);
    return cataloguesCache;
  }

  try {
    console.log('🔄 Fetching catalogues from Firestore...');
    const catalogues = await getAllCatalogues();
    cataloguesCache = catalogues;
    lastFetchTime = now;
    console.log(`✅ Loaded ${catalogues.length} catalogues from Firestore`);

    // Log each catalogue for debugging
    catalogues. forEach(cat => {
      console.log(`  📄 ${cat.titleAr} (${cat.id})`);
      console.log(`     PDF: ${cat.pdfUrl}`);
      console.log(`     Dates: ${cat.startDate} to ${cat.endDate}`);
    });

    return catalogues;
  } catch (error) {
    console.error('❌ Error loading catalogues:', error);
    // Return cached data even if expired, better than nothing
    return cataloguesCache;
  }
};

/**
 * Get catalogue by ID (synchronous - uses cache)
 */
export const getCatalogueById = (id?:  string): Catalogue | undefined => {
  if (!id) return undefined;
  const found = cataloguesCache.find(c => c.id === id);
  console.log(`🔍 getCatalogueById('${id}'):`, found ? 'Found' : 'Not found');
  return found;
};

/**
 * Get all catalogues (synchronous - uses cache)
 */
export const getAllCataloguesSync = (): Catalogue[] => {
  console.log(`📚 getAllCataloguesSync:  Returning ${cataloguesCache.length} catalogues`);
  return cataloguesCache;
};

/**
 * Determine catalogue status based on dates
 */
const getCatalogueStatus = (startDate: string, endDate: string): 'active' | 'upcoming' | 'expired' => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set time to start of day for fair comparison
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (now < start) {
    return 'upcoming';
  } else if (now > end) {
    return 'expired';
  } else {
    return 'active';
  }
};

/**
 * Get catalogues grouped by status (uses cache)
 */
export const getCataloguesGroupedByStatus = (): {
  all: CatalogueWithStatus[];
  active: CatalogueWithStatus[];
  upcoming: CatalogueWithStatus[];
  expired:  CatalogueWithStatus[];
} => {
  console.log(`📊 getCataloguesGroupedByStatus: Processing ${cataloguesCache.length} catalogues`);

  const cataloguesWithStatus: CatalogueWithStatus[] = cataloguesCache.map(catalogue => {
    const status = getCatalogueStatus(catalogue.startDate, catalogue.endDate);

    return {
      ...catalogue,
      status,
      parsedInfo: {
        storeName:  catalogue.storeId,
        storeNameAr: catalogue.storeName || catalogue.titleAr. replace('عروض ', ''),
        startDate: catalogue.startDate,
        endDate: catalogue.endDate,
      },
    };
  });

  const grouped = {
    all: cataloguesWithStatus,
    active: cataloguesWithStatus.filter(c => c.status === 'active'),
    upcoming: cataloguesWithStatus.filter(c => c.status === 'upcoming'),
    expired: cataloguesWithStatus.filter(c => c.status === 'expired'),
  };

  console.log(`📊 Grouped catalogues: `, {
    all: grouped.all.length,
    active: grouped.active.length,
    upcoming: grouped.upcoming.length,
    expired: grouped.expired. length,
  });

  return grouped;
};

/**
 * Force refresh catalogues from Firestore
 */
export const refreshCatalogues = async (): Promise<Catalogue[]> => {
  console.log('🔄 Force refreshing catalogues...');
  lastFetchTime = 0; // Invalidate cache
  return loadCataloguesFromFirestore();
};

/**
 * Clear catalogues cache
 */
export const clearCataloguesCache = () => {
  console.log('🗑️ Clearing catalogues cache');
  cataloguesCache = [];
  lastFetchTime = 0;
};

/**
 * Manually set catalogues (used by Redux after loading)
 */
export const setCataloguesCache = (catalogues: Catalogue[]) => {
  console.log(`💾 Setting catalogues cache: ${catalogues.length} items`);
  cataloguesCache = catalogues;
  lastFetchTime = Date.now();
};