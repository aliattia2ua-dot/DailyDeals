// src/services/cacheService.ts - UPDATED WITH NEW CACHE KEYS
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number; // Track cache hits
}

interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  totalReads: number;
}

export const CACHE_KEYS = {
  // Offers
  OFFERS_ALL: 'cache_offers_all',
  OFFERS_ACTIVE: 'cache_offers_active',
  OFFERS_STATS: 'cache_offers_stats',

  // Catalogues
  CATALOGUES: 'cache_catalogues',
  CATALOGUES_ACTIVE: 'cache_catalogues_active',

  // User-specific (should be invalidated on sign-out)
  USER_FAVORITES: 'cache_user_favorites',
  USER_BASKET: 'cache_user_basket',

  // Search
  SEARCH_RESULTS: 'cache_search_results',
} as const;

// Cache durations in milliseconds
export const CACHE_DURATIONS = {
  // Long-lived data (changes infrequently)
  OFFERS: 30 * 60 * 1000,        // 30 minutes (was 10)
  CATALOGUES: 60 * 60 * 1000,    // 1 hour (was 15 min)
  
  // Medium-lived data
  STATS: 15 * 60 * 1000,         // 15 minutes (was 5)
  USER_DATA: 30 * 60 * 1000,     // 30 minutes (was 5)
  SEARCH: 10 * 60 * 1000,        // 10 minutes (was 5)
  
  // Short-lived (in-memory only)
  STATUS_CALCULATION: 2 * 60 * 1000, // 2 minutes
} as const;

class CacheService {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    totalReads: 0,
  };

  // In-memory cache for frequently accessed, short-lived data
  private memoryCache: Map<string, { data: any; expiry: number }> = new Map();

  // In-flight request tracking for deduplication
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Set cache with automatic expiration
   */
  async set<T>(key: string, data: T, durationMs: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + durationMs,
        hits: 0,
      };
      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log(`💾 Cache SET: ${key} (expires in ${(durationMs / 60000).toFixed(1)}min)`);
    } catch (error) {
      console.error(`❌ Cache SET error for ${key}:`, error);
    }
  }

  /**
   * Get cache if not expired
   */
  async get<T>(key: string): Promise<T | null> {
    this.stats.totalReads++;

    try {
      const item = await AsyncStorage.getItem(key);
      if (!item) {
        this.stats.misses++;
        console.log(`📦 Cache MISS: ${key} (not found)`);
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      if (now > entry.expiresAt) {
        this.stats.misses++;
        const ageMin = ((now - entry.timestamp) / 60000).toFixed(1);
        console.log(`📦 Cache EXPIRED: ${key} (age: ${ageMin}min)`);
        await AsyncStorage.removeItem(key);
        return null;
      }

      // Update hit count
      entry.hits++;
      await AsyncStorage.setItem(key, JSON.stringify(entry));

      this.stats.hits++;
      const ageMin = ((now - entry.timestamp) / 60000).toFixed(1);
      const ttlMin = ((entry.expiresAt - now) / 60000).toFixed(1);
      console.log(`📦 Cache HIT: ${key} (age: ${ageMin}min, ttl: ${ttlMin}min, hits: ${entry.hits})`);

      return entry.data;
    } catch (error) {
      this.stats.misses++;
      console.error(`❌ Cache GET error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Invalidate (clear) specific cache
   */
  async invalidate(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      this.stats.invalidations++;
      console.log(`🗑️ Cache INVALIDATED: ${key}`);
    } catch (error) {
      console.error(`❌ Cache INVALIDATE error for ${key}:`, error);
    }
  }

  /**
   * Invalidate multiple caches at once
   */
  async invalidateMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.invalidate(key)));
    console.log(`🗑️ Invalidated ${keys.length} caches`);
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
      this.stats.invalidations += keys.length;
      this.clearMemoryCache();
      console.log('🗑️ All caches cleared (AsyncStorage + Memory)');
    } catch (error) {
      console.error('❌ Error clearing all caches:', error);
    }
  }

  /**
   * Clear user-specific caches (call on sign-out)
   */
  async clearUserCaches(): Promise<void> {
    const userKeys = [
      CACHE_KEYS.USER_FAVORITES,
      CACHE_KEYS.USER_BASKET,
    ];
    await this.invalidateMultiple(userKeys);
    console.log('🗑️ User caches cleared');
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<number> {
    try {
      const keys = Object.values(CACHE_KEYS);
      const now = Date.now();
      let cleaned = 0;

      for (const key of keys) {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            const entry: CacheEntry<any> = JSON.parse(item);
            if (now > entry.expiresAt) {
              await AsyncStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch {
          // Skip invalid entries
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
      }

      return cleaned;
    } catch (error) {
      console.error('❌ Error during cache cleanup:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: string } {
    const hitRate = this.stats.totalReads > 0
      ? (this.stats.hits / this.stats.totalReads * 100).toFixed(1)
      : '0.0';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalReads: 0,
    };
    console.log('📊 Cache statistics reset');
  }

  /**
   * Get cache info for debugging
   */
  async getCacheInfo(): Promise<{
    key: string;
    size: number;
    ageMin: number;
    ttlMin: number;
    hits: number;
    expired: boolean;
  }[]> {
    const info: any[] = [];
    const now = Date.now();

    for (const key of Object.values(CACHE_KEYS)) {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const entry: CacheEntry<any> = JSON.parse(item);
          info.push({
            key,
            size: new Blob([item]).size,
            ageMin: ((now - entry.timestamp) / 60000).toFixed(1),
            ttlMin: ((entry.expiresAt - now) / 60000).toFixed(1),
            hits: entry.hits || 0,
            expired: now > entry.expiresAt,
          });
        }
      } catch (error) {
        // Skip invalid entries
      }
    }

    return info;
  }

  /**
   * Get data from in-memory cache
   */
  getFromMemory<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      console.log(`💨 Memory cache HIT: ${key}`);
      return cached.data as T;
    }
    if (cached) {
      this.memoryCache.delete(key);
      console.log(`💨 Memory cache EXPIRED: ${key}`);
    }
    return null;
  }

  /**
   * Set data in in-memory cache
   */
  setInMemory<T>(key: string, data: T, ttlMs: number = 60 * 1000): void {
    this.memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
    console.log(`💨 Memory cache SET: ${key} (expires in ${(ttlMs / 1000).toFixed(0)}s)`);
  }

  /**
   * Clear in-memory cache
   */
  clearMemoryCache(): void {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    console.log(`💨 Memory cache cleared (${size} entries)`);
  }

  /**
   * Get catalogue status with caching (in-memory)
   * Caches results for 2 minutes to avoid recalculating on every render
   */
  getCatalogueStatus(
    catalogueId: string,
    startDate: string,
    endDate: string
  ): 'active' | 'upcoming' | 'expired' {
    const cacheKey = `catalogue_status_${catalogueId}_${startDate}_${endDate}`;
    
    // Check memory cache first
    const cached = this.getFromMemory<'active' | 'upcoming' | 'expired'>(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate status
    const status = this.calculateCatalogueStatus(startDate, endDate);
    
    // Cache in memory with 2-minute TTL
    this.setInMemory(cacheKey, status, CACHE_DURATIONS.STATUS_CALCULATION);
    
    return status;
  }

  /**
   * Calculate catalogue status (internal helper)
   */
  private calculateCatalogueStatus(
    startDate: string,
    endDate: string
  ): 'active' | 'upcoming' | 'expired' {
    try {
      const now = new Date();
      const normalizedStart = this.normalizeDate(startDate);
      const normalizedEnd = this.normalizeDate(endDate);

      const start = new Date(normalizedStart);
      const end = new Date(normalizedEnd);

      now.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('❌ Invalid date format:', { startDate, endDate });
        return 'expired';
      }

      if (now < start) return 'upcoming';
      if (now > end) return 'expired';
      return 'active';
    } catch (error) {
      console.error('❌ Error calculating catalogue status:', error);
      return 'expired';
    }
  }

  /**
   * Normalize date string to YYYY-MM-DD format
   */
  private normalizeDate(dateStr: string): string {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  /**
   * Execute a fetch function with deduplication
   * Prevents multiple simultaneous requests for the same data
   */
  async fetchWithDeduplication<T>(
    key: string,
    fetchFn: () => Promise<T>,
    cacheKey?: string,
    cacheDuration?: number
  ): Promise<T> {
    // Check if request is already in-flight
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`🔄 [Dedup] Waiting for in-flight request: ${key}`);
      return pending;
    }

    // Check cache first
    if (cacheKey) {
      const cached = await this.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Create and track the request
    const request = (async () => {
      try {
        const result = await fetchFn();
        
        // Cache if requested
        if (cacheKey && cacheDuration) {
          await this.set(cacheKey, result, cacheDuration);
        }
        
        return result;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, request);
    console.log(`🚀 [Dedup] Starting new request: ${key}`);
    
    return request;
  }

  /**
   * Prewarm cache - fetch and cache data proactively
   */
  async prewarm(
    fetchFn: () => Promise<any>,
    cacheKey: string,
    duration: number
  ): Promise<void> {
    try {
      console.log(`🔥 Prewarming cache: ${cacheKey}`);
      const data = await fetchFn();
      await this.set(cacheKey, data, duration);
      console.log(`✅ Cache prewarmed: ${cacheKey}`);
    } catch (error) {
      console.error(`❌ Prewarm failed for ${cacheKey}:`, error);
    }
  }

  /**
   * Log detailed cache statistics
   */
  async logDetailedStats(): Promise<void> {
    console.log('\n📊 ===== CACHE STATISTICS =====');

    const stats = this.getStats();
    console.log('Overall Stats:');
    console.log(`  Total Reads: ${stats.totalReads}`);
    console.log(`  Hits: ${stats.hits}`);
    console.log(`  Misses: ${stats.misses}`);
    console.log(`  Hit Rate: ${stats.hitRate}`);
    console.log(`  Invalidations: ${stats.invalidations}`);

    const cacheInfo = await this.getCacheInfo();
    console.log('\nCache Details:');
    for (const info of cacheInfo) {
      const status = info.expired ? '❌ EXPIRED' : '✅ VALID';
      console.log(`  ${status} ${info.key}:`);
      console.log(`    Age: ${info.ageMin}min, TTL: ${info.ttlMin}min`);
      console.log(`    Size: ${(info.size / 1024).toFixed(2)} KB, Hits: ${info.hits}`);
    }
    console.log('===========================\n');
  }
}

export const cacheService = new CacheService();

// Export singleton instance
export default cacheService;