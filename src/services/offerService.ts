// src/services/offerService.ts - OPTIMIZED WITH BATCHING + FAVORITES SUPPORT
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CatalogueOffer } from './catalogueOfferService';
import { getTodayString, normalizeDateString } from '../utils/dateUtils';
import { cacheService, CACHE_KEYS, CACHE_DURATIONS } from './cacheService';

export interface OfferWithCatalogue extends CatalogueOffer {
  catalogueId: string;
  storeId: string;
  storeName: string;
  catalogueTitle: string;
  catalogueStartDate: string;
  catalogueEndDate: string;
  isActive: boolean;
}

/**
 * Check if an offer is currently active based on catalogue dates
 */
const isOfferActive = (startDate: string, endDate: string): boolean => {
  const today = getTodayString();
  const normalizedStart = normalizeDateString(startDate);
  const normalizedEnd = normalizeDateString(endDate);
  return normalizedStart <= today && normalizedEnd >= today;
};

/**
 * Get ALL offers - CACHED (use sparingly!)
 */
export async function getAllOffers(
  forceRefresh: boolean = false,
  maxResults: number = 200
): Promise<OfferWithCatalogue[]> {
  return cacheService.fetchWithDeduplication(
    'get_all_offers',
    async () => {
      console.log(`🔥 Firebase: Fetching ALL offers (limit: ${maxResults})...`);
      // Note: Without orderBy, Firestore will return documents in natural order
      const q = query(
        collection(db, 'offers'),
        limit(maxResults)
      );
      const snapshot = await getDocs(q);
      const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue));

      console.log(`✅ Fetched ${offers.length} total offers`);
      return offers;
    },
    forceRefresh ? undefined : CACHE_KEYS.OFFERS_ALL,
    CACHE_DURATIONS.OFFERS
  );
}

/**
 * Get all active offers - CACHED
 */
export async function getActiveOffers(forceRefresh: boolean = false): Promise<OfferWithCatalogue[]> {
  return cacheService.fetchWithDeduplication(
    'get_active_offers',
    async () => {
      const today = getTodayString();
      console.log(`🔥 Firebase: Fetching active offers for date: ${today} (limit: 100)`);

      const q = query(
        collection(db, 'offers'),
        where('catalogueEndDate', '>=', today),
        orderBy('catalogueEndDate', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const allOffers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OfferWithCatalogue));

      const activeOffers = allOffers.filter(offer =>
        isOfferActive(offer.catalogueStartDate, offer.catalogueEndDate)
      );

      console.log(`✅ Fetched ${activeOffers.length} active offers`);
      return activeOffers;
    },
    forceRefresh ? undefined : CACHE_KEYS.OFFERS_ACTIVE,
    CACHE_DURATIONS.OFFERS
  );
}

/**
 * Get lightweight offer stats - CACHED (for counts only)
 */
export async function getOfferStats(forceRefresh: boolean = false): Promise<{
  all: number;
  active: number;
  upcoming: number;
  expired: number;
}> {
  if (!forceRefresh) {
    const cached = await cacheService.get<any>(CACHE_KEYS.OFFERS_STATS);
    if (cached) {
      console.log('📦 Using cached offer stats');
      return cached;
    }
  }

  console.log('🔥 Firebase: Calculating offer stats...');
  const today = getTodayString();

  const snapshot = await getDocs(collection(db, 'offers'));

  let all = 0;
  let active = 0;
  let upcoming = 0;
  let expired = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const start = normalizeDateString(data.catalogueStartDate);
    const end = normalizeDateString(data.catalogueEndDate);

    all++;
    if (start <= today && end >= today) {
      active++;
    } else if (start > today) {
      upcoming++;
    } else {
      expired++;
    }
  });

  const stats = { all, active, upcoming, expired };

  await cacheService.set(CACHE_KEYS.OFFERS_STATS, stats, CACHE_DURATIONS.STATS);

  console.log('✅ Calculated and cached offer stats:', stats);
  return stats;
}

/**
 * OPTIMIZED: Get offers for multiple categories in batches
 * Firebase 'in' operator supports max 10 items per query
 * Used for FAVORITES - fetching offers for multiple favorite subcategories
 */
export async function getOffersForCategories(
  categoryIds: string[],
  activeOnly: boolean = true
): Promise<OfferWithCatalogue[]> {
  if (categoryIds.length === 0) return [];

  console.log(`🔥 Firebase: Fetching offers for ${categoryIds.length} categories (batched)`);

  const today = getTodayString();
  const batches: Promise<any>[] = [];

  // Split into batches of 10 (Firebase limit)
  for (let i = 0; i < categoryIds.length; i += 10) {
    const batch = categoryIds.slice(i, i + 10);

    const constraints = [
      where('categoryId', 'in', batch)
    ];

    if (activeOnly) {
      constraints.push(where('catalogueEndDate', '>=', today));
    }

    const q = query(collection(db, 'offers'), ...constraints);
    batches.push(getDocs(q));
  }

  const snapshots = await Promise.all(batches);

  const allOffers = snapshots.flatMap(snap =>
    snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue))
  );

  // Filter for active if needed
  const filteredOffers = activeOnly
    ? allOffers.filter(offer => isOfferActive(offer.catalogueStartDate, offer.catalogueEndDate))
    : allOffers;

  console.log(`✅ Found ${filteredOffers.length} offers across ${categoryIds.length} categories`);
  return filteredOffers;
}

/**
 * OPTIMIZED: Get offers for multiple stores in batches
 */
export async function getOffersForStores(
  storeIds: string[],
  activeOnly: boolean = true
): Promise<OfferWithCatalogue[]> {
  if (storeIds.length === 0) return [];

  console.log(`🔥 Firebase: Fetching offers for ${storeIds.length} stores (batched)`);

  const today = getTodayString();
  const batches: Promise<any>[] = [];

  for (let i = 0; i < storeIds.length; i += 10) {
    const batch = storeIds.slice(i, i + 10);

    const constraints = [
      where('storeId', 'in', batch)
    ];

    if (activeOnly) {
      constraints.push(where('catalogueEndDate', '>=', today));
    }

    const q = query(collection(db, 'offers'), ...constraints);
    batches.push(getDocs(q));
  }

  const snapshots = await Promise.all(batches);

  const allOffers = snapshots.flatMap(snap =>
    snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue))
  );

  const filteredOffers = activeOnly
    ? allOffers.filter(offer => isOfferActive(offer.catalogueStartDate, offer.catalogueEndDate))
    : allOffers;

  console.log(`✅ Found ${filteredOffers.length} offers across ${storeIds.length} stores`);
  return filteredOffers;
}

/**
 * Get offers by catalogue - NO CACHE (specific queries)
 */
export async function getOffersByCatalogue(catalogueId: string): Promise<OfferWithCatalogue[]> {
  console.log(`🔥 Firebase: Fetching offers for catalogue ${catalogueId}`);

  const q = query(
    collection(db, 'offers'),
    where('catalogueId', '==', catalogueId)
  );

  const snapshot = await getDocs(q);
  const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue));

  console.log(`✅ Found ${offers.length} offers for catalogue`);
  return offers;
}

/**
 * Get offers by category - NO CACHE (filtered queries)
 */
export async function getOffersByCategory(
  categoryId: string,
  activeOnly: boolean = true
): Promise<OfferWithCatalogue[]> {
  console.log(`🔥 Firebase: category=${categoryId}, activeOnly=${activeOnly}`);

  if (!activeOnly) {
    const q = query(
      collection(db, 'offers'),
      where('categoryId', '==', categoryId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue));
  }

  const today = getTodayString();
  const q = query(
    collection(db, 'offers'),
    where('categoryId', '==', categoryId),
    where('catalogueEndDate', '>=', today)
  );

  const snapshot = await getDocs(q);
  const allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue));

  const activeOffers = allOffers.filter(offer =>
    isOfferActive(offer.catalogueStartDate, offer.catalogueEndDate)
  );

  console.log(`✅ Found ${activeOffers.length} active offers for category`);
  return activeOffers;
}

/**
 * Get offers by store - NO CACHE (filtered queries)
 */
export async function getOffersByStore(
  storeId: string,
  activeOnly: boolean = true
): Promise<OfferWithCatalogue[]> {
  console.log(`🔥 Firebase: store=${storeId}, activeOnly=${activeOnly}`);

  if (!activeOnly) {
    const q = query(
      collection(db, 'offers'),
      where('storeId', '==', storeId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue));
  }

  const today = getTodayString();
  const q = query(
    collection(db, 'offers'),
    where('storeId', '==', storeId),
    where('catalogueEndDate', '>=', today)
  );

  const snapshot = await getDocs(q);
  const allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfferWithCatalogue));

  const activeOffers = allOffers.filter(offer =>
    isOfferActive(offer.catalogueStartDate, offer.catalogueEndDate)
  );

  console.log(`✅ Found ${activeOffers.length} active offers for store`);
  return activeOffers;
}

/**
 * Get single offer by ID - NO CACHE (individual document reads are cheap)
 */
export async function getOfferById(offerId: string): Promise<OfferWithCatalogue | null> {
  console.log(`🔥 Firebase: Fetching offer ${offerId}`);

  const docRef = doc(db, 'offers', offerId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as OfferWithCatalogue;
  }

  return null;
}

// ============================================
// FAVORITES SUPPORT FUNCTIONS
// ============================================

/**
 * Get offers by subcategory ID (single category)
 * Used for displaying favorite subcategory offers
 * Alias for getOffersByCategory for better naming in favorites context
 */
export async function getOffersBySubcategory(
  subcategoryId: string,
  activeOnly: boolean = true
): Promise<OfferWithCatalogue[]> {
  return getOffersByCategory(subcategoryId, activeOnly);
}

/**
 * Get offers by multiple subcategory IDs (batch query)
 * Efficient batch query for favorites - uses getOffersForCategories
 * This is the MAIN function for favorites screen
 */
export async function getOffersBySubcategories(
  subcategoryIds: string[],
  activeOnly: boolean = true
): Promise<OfferWithCatalogue[]> {
  return getOffersForCategories(subcategoryIds, activeOnly);
}

/**
 * Check if a subcategory has any active offers
 * Useful for showing/hiding empty favorite subcategories
 */
export async function subcategoryHasOffers(
  subcategoryId: string
): Promise<boolean> {
  try {
    const today = getTodayString();
    const q = query(
      collection(db, 'offers'),
      where('categoryId', '==', subcategoryId),
      where('catalogueEndDate', '>=', today)
    );

    const snapshot = await getDocs(q);

    // Check if any offers are actually active (not just in date range)
    const hasActiveOffers = snapshot.docs.some(doc => {
      const data = doc.data();
      return isOfferActive(data.catalogueStartDate, data.catalogueEndDate);
    });

    return hasActiveOffers;
  } catch (error) {
    console.error(`❌ Error checking subcategory offers:`, error);
    return false;
  }
}

/**
 * Get counts of offers per subcategory (for favorites overview)
 * Returns a map of subcategoryId -> count
 */
export async function getOfferCountsBySubcategories(
  subcategoryIds: string[]
): Promise<Record<string, number>> {
  if (subcategoryIds.length === 0) return {};

  try {
    const offers = await getOffersForCategories(subcategoryIds, true);

    const counts: Record<string, number> = {};
    subcategoryIds.forEach(id => {
      counts[id] = 0;
    });

    offers.forEach(offer => {
      if (counts[offer.categoryId] !== undefined) {
        counts[offer.categoryId]++;
      }
    });

    console.log('📊 Offer counts by subcategory:', counts);
    return counts;
  } catch (error) {
    console.error('❌ Error getting offer counts:', error);
    return {};
  }
}

/**
 * Check which favorite subcategories are empty (no active offers)
 * Returns array of subcategory IDs that have no offers
 */
export async function getEmptyFavoriteSubcategories(
  subcategoryIds: string[]
): Promise<string[]> {
  if (subcategoryIds.length === 0) return [];

  try {
    const counts = await getOfferCountsBySubcategories(subcategoryIds);
    const emptySubcategories = Object.entries(counts)
      .filter(([_, count]) => count === 0)
      .map(([id, _]) => id);

    console.log(`⚠️ ${emptySubcategories.length} subcategories are empty:`, emptySubcategories);
    return emptySubcategories;
  } catch (error) {
    console.error('❌ Error checking empty subcategories:', error);
    return [];
  }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Invalidate all offer caches (call after data changes)
 */
export async function invalidateOfferCaches(): Promise<void> {
  await Promise.all([
    cacheService.invalidate(CACHE_KEYS.OFFERS_ALL),
    cacheService.invalidate(CACHE_KEYS.OFFERS_ACTIVE),
    cacheService.invalidate(CACHE_KEYS.OFFERS_STATS),
  ]);
  console.log('🗑️ All offer caches invalidated');
}