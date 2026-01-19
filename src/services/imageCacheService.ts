// src/services/imageCacheService.ts - FIXED: Using new Expo FileSystem API
import { Directory, File } from 'expo-file-system/next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedImage {
  url: string;
  localPath: string;
  cachedAt: number;
  size: number;
  priority: 'high' | 'normal' | 'low';
}

const CACHE_DIR_NAME = 'images';
const CACHE_METADATA_KEY = '@image_cache_metadata';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

class ImageCacheService {
  private metadata: Map<string, CachedImage> = new Map();
  private initialized = false;
  private cacheDir: Directory | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // ✅ NEW: Use Directory API
      this.cacheDir = new Directory(Directory.cache, CACHE_DIR_NAME);

      // Create cache directory if it doesn't exist
      if (!await this.cacheDir.exists()) {
        await this.cacheDir.create();
        console.log('📁 Created image cache directory');
      }

      // Load metadata
      const metadataJson = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (metadataJson) {
        const metadataArray: CachedImage[] = JSON.parse(metadataJson);
        this.metadata = new Map(metadataArray.map(item => [item.url, item]));
        console.log(`📦 Loaded ${this.metadata.size} cached images`);
      }

      this.initialized = true;

      // Clean up expired cache in background
      this.cleanupExpiredCache();
    } catch (error) {
      console.error('❌ Failed to initialize image cache:', error);
    }
  }

  /**
   * Get cached image path or download and cache
   */
  async getCachedImage(
    url: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    await this.init();

    // Check if already cached
    const cached = this.metadata.get(url);
    if (cached) {
      try {
        const file = new File(cached.localPath);
        if (await file.exists()) {
          // Check if expired
          if (Date.now() - cached.cachedAt < CACHE_DURATION) {
            console.log(`✅ Cache HIT: ${url.substring(0, 50)}...`);
            return file.uri; // Return file:// URI
          } else {
            console.log(`⏰ Cache EXPIRED: ${url.substring(0, 50)}...`);
            await this.removeFromCache(url);
          }
        }
      } catch (error) {
        console.error('Error checking cached file:', error);
      }
    }

    // Download and cache
    console.log(`⬇️ Downloading image: ${url.substring(0, 50)}...`);
    return await this.downloadAndCache(url, priority);
  }

  /**
   * ✅ FIXED: Download image using new File API
   */
  private async downloadAndCache(
    url: string,
    priority: 'high' | 'normal' | 'low'
  ): Promise<string> {
    if (!this.cacheDir) {
      throw new Error('Cache directory not initialized');
    }

    try {
      // Generate unique filename
      const filename = this.getFilenameFromUrl(url);
      const file = new File(this.cacheDir, filename);

      // ✅ NEW: Download using File.downloadAsync()
      await file.downloadAsync(url);

      // Get file size
      const size = await file.size();

      // Save metadata
      const cachedImage: CachedImage = {
        url,
        localPath: file.path, // Store the path for metadata
        cachedAt: Date.now(),
        size: size || 0,
        priority,
      };

      this.metadata.set(url, cachedImage);
      await this.saveMetadata();

      console.log(`✅ Cached image: ${filename} (${((size || 0) / 1024).toFixed(1)}KB, priority: ${priority})`);

      // Check cache size and cleanup if needed
      await this.enforceMaxCacheSize();

      return file.uri; // Return file:// URI
    } catch (error) {
      console.error(`❌ Failed to cache image:`, error);
      // Return original URL as fallback
      return url;
    }
  }

  /**
   * Remove image from cache
   */
  async removeFromCache(url: string): Promise<void> {
    const cached = this.metadata.get(url);
    if (!cached) return;

    try {
      const file = new File(cached.localPath);
      if (await file.exists()) {
        await file.delete();
      }
      this.metadata.delete(url);
      await this.saveMetadata();
      console.log(`🗑️ Removed from cache: ${url.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ Failed to remove from cache:', error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    if (!this.cacheDir) return;

    try {
      if (await this.cacheDir.exists()) {
        await this.cacheDir.delete();
        await this.cacheDir.create();
      }
      this.metadata.clear();
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
      console.log('🗑️ Image cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredCache(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [url, cached] of this.metadata.entries()) {
      if (now - cached.cachedAt > CACHE_DURATION) {
        await this.removeFromCache(url);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired images from cache`);
    }
  }

  /**
   * Enforce maximum cache size by removing oldest low-priority items
   */
  private async enforceMaxCacheSize(): Promise<void> {
    const totalSize = Array.from(this.metadata.values())
      .reduce((sum, item) => sum + item.size, 0);

    if (totalSize <= MAX_CACHE_SIZE) return;

    console.log(`⚠️ Cache size limit exceeded: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);

    // Sort by priority (low first) then by age (oldest first)
    const sortedEntries = Array.from(this.metadata.entries())
      .sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a[1].cachedAt - b[1].cachedAt;
      });

    // Remove oldest low-priority items until under limit
    let currentSize = totalSize;
    for (const [url, cached] of sortedEntries) {
      if (currentSize <= MAX_CACHE_SIZE) break;
      if (cached.priority === 'high') break; // Never remove high-priority items

      await this.removeFromCache(url);
      currentSize -= cached.size;
    }

    console.log(`✅ Cache size reduced to ${(currentSize / 1024 / 1024).toFixed(1)}MB`);
  }

  /**
   * Save metadata to AsyncStorage
   */
  private async saveMetadata(): Promise<void> {
    try {
      const metadataArray = Array.from(this.metadata.values());
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadataArray));
    } catch (error) {
      console.error('❌ Failed to save cache metadata:', error);
    }
  }

  /**
   * Generate filename from URL
   */
  private getFilenameFromUrl(url: string): string {
    // Extract filename from URL or generate hash
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const cleanName = lastPart.split('?')[0]; // Remove query params

    // If filename is too long or has invalid chars, use hash
    if (cleanName.length > 50 || !/^[a-zA-Z0-9._-]+$/.test(cleanName)) {
      const hash = this.simpleHash(url);
      const ext = cleanName.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[0] || '.jpg';
      return `img_${hash}${ext}`;
    }

    return cleanName;
  }

  /**
   * Simple hash function for generating filenames
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    itemCount: number;
    totalSize: number;
    totalSizeMB: string;
    highPriority: number;
    normalPriority: number;
    lowPriority: number;
  }> {
    await this.init();

    const items = Array.from(this.metadata.values());
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);

    return {
      itemCount: items.length,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      highPriority: items.filter(i => i.priority === 'high').length,
      normalPriority: items.filter(i => i.priority === 'normal').length,
      lowPriority: items.filter(i => i.priority === 'low').length,
    };
  }

  /**
   * Prefetch images for basket items
   */
  async prefetchBasketImages(imageUrls: string[]): Promise<void> {
    console.log(`🔥 Prefetching ${imageUrls.length} basket images...`);

    await Promise.all(
      imageUrls.map(url =>
        this.getCachedImage(url, 'high').catch(err => {
          console.error(`Failed to prefetch ${url}:`, err);
        })
      )
    );

    console.log('✅ Basket images prefetched');
  }
}

export const imageCacheService = new ImageCacheService();
export default imageCacheService;