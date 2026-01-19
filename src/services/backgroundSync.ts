// src/services/backgroundSync.ts - BACKGROUND CACHE REFRESH
import { AppState, AppStateStatus } from 'react-native';
import { cacheService } from './cacheService';
import { getActiveOffers, getOfferStats } from './offerService';
import { getAllCatalogues } from './catalogueService';

// Sync intervals (in milliseconds)
const SYNC_INTERVALS = {
  OFFERS: 30 * 60 * 1000,      // 30 minutes for offers (was 10)
  CATALOGUES: 60 * 60 * 1000,  // 1 hour for catalogues (was 15)
  STATS: 30 * 60 * 1000,       // 30 minutes for stats (was 5)
};

let offersTimer: NodeJS.Timeout | null = null;
let cataloguesTimer: NodeJS.Timeout | null = null;
let statsTimer: NodeJS.Timeout | null = null;
let appStateSubscription: any = null;
let isAppActive = true;
let lastRefreshTime: number = 0;

/**
 * Refresh offers cache in background
 */
async function refreshOffersCache() {
  if (!isAppActive) {
    console.log('⏸️ App inactive, skipping offers refresh');
    return;
  }

  try {
    console.log('🔄 Background: Refreshing offers cache...');
    await getActiveOffers(true); // Force refresh
    console.log('✅ Background: Offers cache refreshed');
  } catch (error) {
    console.error('❌ Background: Error refreshing offers cache:', error);
  }
}

/**
 * Refresh catalogues cache in background
 */
async function refreshCataloguesCache() {
  if (!isAppActive) {
    console.log('⏸️ App inactive, skipping catalogues refresh');
    return;
  }

  try {
    console.log('🔄 Background: Refreshing catalogues cache...');
    await getAllCatalogues(true); // Force refresh
    console.log('✅ Background: Catalogues cache refreshed');
  } catch (error) {
    console.error('❌ Background: Error refreshing catalogues cache:', error);
  }
}

/**
 * Refresh stats cache in background
 */
async function refreshStatsCache() {
  if (!isAppActive) {
    console.log('⏸️ App inactive, skipping stats refresh');
    return;
  }

  try {
    console.log('🔄 Background: Refreshing stats cache...');
    await getOfferStats(true); // Force refresh
    console.log('✅ Background: Stats cache refreshed');
  } catch (error) {
    console.error('❌ Background: Error refreshing stats cache:', error);
  }
}

/**
 * Refresh all caches (internal helper)
 */
async function refreshAllCaches() {
  await Promise.all([
    refreshOffersCache(),
    refreshCataloguesCache(),
    refreshStatsCache(),
  ]);
}

/**
 * Handle app state changes (active/background/inactive)
 */
function handleAppStateChange(nextAppState: AppStateStatus) {
  const wasActive = isAppActive;
  isAppActive = nextAppState === 'active';

  if (!wasActive && isAppActive) {
    // Only refresh if cache is expired or stale (> 30 minutes)
    const now = Date.now();
    if (!lastRefreshTime || (now - lastRefreshTime) > 30 * 60 * 1000) {
      console.log('📱 App became active, cache is stale - refreshing...');
      refreshAllCaches();
      lastRefreshTime = now;
    } else {
      console.log('📱 App became active, cache is fresh - skipping refresh');
    }
  } else if (wasActive && !isAppActive) {
    console.log('📱 App went to background');
  }
}

/**
 * Start background sync for all caches
 * Call this in your root App component or _layout.tsx
 */
export function startBackgroundSync() {
  console.log('🚀 Starting background sync service...');

  // Set up app state listener
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  isAppActive = AppState.currentState === 'active';

  // Start periodic refresh timers
  offersTimer = setInterval(refreshOffersCache, SYNC_INTERVALS.OFFERS);
  cataloguesTimer = setInterval(refreshCataloguesCache, SYNC_INTERVALS.CATALOGUES);
  statsTimer = setInterval(refreshStatsCache, SYNC_INTERVALS.STATS);

  // Do initial refresh
  if (isAppActive) {
    console.log('📱 App is active, performing initial cache refresh...');
    refreshAllCaches();
    lastRefreshTime = Date.now();
  }

  console.log('✅ Background sync service started');
  console.log(`   - Offers refresh: every ${SYNC_INTERVALS.OFFERS / 60000} minutes`);
  console.log(`   - Catalogues refresh: every ${SYNC_INTERVALS.CATALOGUES / 60000} minutes`);
  console.log(`   - Stats refresh: every ${SYNC_INTERVALS.STATS / 60000} minutes`);
}

/**
 * Stop background sync
 * Call this when unmounting or when you want to stop background updates
 */
export function stopBackgroundSync() {
  console.log('🛑 Stopping background sync service...');

  // Clear timers
  if (offersTimer) {
    clearInterval(offersTimer);
    offersTimer = null;
  }
  if (cataloguesTimer) {
    clearInterval(cataloguesTimer);
    cataloguesTimer = null;
  }
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = null;
  }

  // Remove app state listener
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  console.log('✅ Background sync service stopped');
}

/**
 * Force immediate refresh of all caches
 * Useful for manual refresh actions (pull-to-refresh)
 */
export async function forceRefreshAll(): Promise<void> {
  console.log('🔄 Force refreshing all caches...');
  
  await Promise.all([
    refreshOffersCache(),
    refreshCataloguesCache(),
    refreshStatsCache(),
  ]);
  
  console.log('✅ All caches force refreshed');
}

/**
 * Clear all caches
 * Useful for logout or cache management
 */
export async function clearAllCaches(): Promise<void> {
  console.log('🗑️ Clearing all caches...');
  await cacheService.clear();
  console.log('✅ All caches cleared');
}

/**
 * Get sync status
 */
export function getSyncStatus() {
  return {
    isActive: isAppActive,
    isRunning: offersTimer !== null,
    intervals: SYNC_INTERVALS,
  };
}