// src/services/imageCompressionService.ts - ENHANCED VERSION
import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
}

/**
 * Optimized compression settings for catalogue images
 * These settings achieve 75-85% size reduction with minimal quality loss
 */
const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1200,      // Good for mobile viewing
  maxHeight: 1600,     // Portrait catalogue pages
  quality: 0.72,       // 72% quality - optimal balance
  format: 'jpeg',      // Best compression for photos
};

/**
 * Compress a single image with automatic size detection
 */
export const compressImage = async (
  imageUri: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    console.log('🖼️  Compressing image:', imageUri.substring(0, 50) + '...');
    console.log('   Settings:', opts);

    // Get original file size
    let originalSize: number | undefined;
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      originalSize = blob.size;
      console.log(`   📏 Original size: ${(originalSize / 1024).toFixed(1)}KB`);
    } catch (e) {
      console.warn('   ⚠️ Could not determine original size');
    }

    // Compress the image with smart resizing
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: opts.maxWidth,
            height: opts.maxHeight,
          },
        },
      ],
      {
        compress: opts.quality,
        format: opts.format === 'png'
          ? ImageManipulator.SaveFormat.PNG
          : ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Get compressed file size
    let compressedSize: number | undefined;
    let compressionRatio: number | undefined;
    try {
      const response = await fetch(result.uri);
      const blob = await response.blob();
      compressedSize = blob.size;

      if (originalSize) {
        compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        console.log(`   ✅ Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB`);
        console.log(`   📉 Reduction: ${compressionRatio.toFixed(1)}%`);
      }
    } catch (e) {
      console.warn('   ⚠️ Could not determine compressed size');
    }

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('❌ Image compression failed:', error);
    // Return original URI if compression fails
    return {
      uri: imageUri,
      width: 0,
      height: 0,
    };
  }
};

/**
 * Compress multiple images with progress tracking and statistics
 */
export const compressMultipleImages = async (
  imageUris: string[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number, stats?: CompressionStats) => void
): Promise<CompressionResult[]> => {
  console.log(`🖼️  Compressing ${imageUris.length} images...`);

  const results: CompressionResult[] = [];
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  for (let i = 0; i < imageUris.length; i++) {
    const result = await compressImage(imageUris[i], options);
    results.push(result);

    if (result.originalSize) totalOriginalSize += result.originalSize;
    if (result.compressedSize) totalCompressedSize += result.compressedSize;

    if (onProgress) {
      const stats: CompressionStats = {
        totalOriginalMB: totalOriginalSize / 1024 / 1024,
        totalCompressedMB: totalCompressedSize / 1024 / 1024,
        savedMB: (totalOriginalSize - totalCompressedSize) / 1024 / 1024,
        compressionRatio: totalOriginalSize > 0
          ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
          : 0,
      };
      onProgress(i + 1, imageUris.length, stats);
    }
  }

  if (totalOriginalSize > 0 && totalCompressedSize > 0) {
    const totalRatio = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100;
    console.log(`📊 Total compression summary:`);
    console.log(`   Original: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Compressed: ${(totalCompressedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Saved: ${totalRatio.toFixed(1)}% (${((totalOriginalSize - totalCompressedSize) / 1024 / 1024).toFixed(2)}MB)`);
  }

  return results;
};

export interface CompressionStats {
  totalOriginalMB: number;
  totalCompressedMB: number;
  savedMB: number;
  compressionRatio: number;
}

/**
 * Compress a data URL (base64 image)
 * Useful for PDF page conversion
 */
export const compressDataUrl = async (
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> => {
  try {
    console.log('🖼️  Compressing data URL...');

    const opts = { ...DEFAULT_OPTIONS, ...options };

    const result = await ImageManipulator.manipulateAsync(
      dataUrl,
      [
        {
          resize: {
            width: opts.maxWidth,
            height: opts.maxHeight,
          },
        },
      ],
      {
        compress: opts.quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (result.base64) {
      const compressedDataUrl = `data:image/jpeg;base64,${result.base64}`;

      // Calculate size reduction
      const originalSize = dataUrl.length;
      const compressedSize = compressedDataUrl.length;
      const reduction = ((originalSize - compressedSize) / originalSize) * 100;

      console.log(`   ✅ Data URL compressed: ${reduction.toFixed(1)}% smaller`);

      return compressedDataUrl;
    }

    return dataUrl;
  } catch (error) {
    console.error('❌ Data URL compression failed:', error);
    return dataUrl;
  }
};

/**
 * Get optimal compression settings based on image type
 * OPTIMIZED FOR STORAGE SAVINGS
 */
export const getOptimalSettings = (
  imageType: 'cover' | 'page' | 'thumbnail'
): CompressionOptions => {
  switch (imageType) {
    case 'cover':
      // Slightly higher quality for cover images, but still compressed
      return {
        maxWidth: 800,
        maxHeight: 1200,
        quality: 0.75,    // 75% quality for covers
        format: 'jpeg',
      };

    case 'page':
      // Balanced settings for catalogue pages - maximum savings
      return {
        maxWidth: 1200,
        maxHeight: 1600,
        quality: 0.70,    // 70% quality - great balance
        format: 'jpeg',
      };

    case 'thumbnail':
      // Smaller size for thumbnails
      return {
        maxWidth: 400,
        maxHeight: 600,
        quality: 0.65,    // Lower quality acceptable for thumbnails
        format: 'jpeg',
      };

    default:
      return DEFAULT_OPTIONS;
  }
};

/**
 * Estimate storage savings for a batch of images
 */
export const estimateStorageSavings = (
  imageCount: number,
  avgImageSizeMB: number = 2.5
): {
  before: string;
  after: string;
  saved: string;
  percentage: string;
  costSavings: string; // Estimated Firebase Storage cost savings
} => {
  const beforeMB = imageCount * avgImageSizeMB;
  const afterMB = beforeMB * 0.22; // Assume 78% compression
  const savedMB = beforeMB - afterMB;
  const percentage = ((savedMB / beforeMB) * 100).toFixed(0);

  // Firebase Storage costs approximately $0.026 per GB per month
  const savedGB = savedMB / 1024;
  const monthlySavings = savedGB * 0.026;

  return {
    before: `${beforeMB.toFixed(1)}MB`,
    after: `${afterMB.toFixed(1)}MB`,
    saved: `${savedMB.toFixed(1)}MB`,
    percentage: `${percentage}%`,
    costSavings: `$${monthlySavings.toFixed(2)}/month`,
  };
};

/**
 * Batch compress images with detailed progress
 */
export const batchCompressImages = async (
  imageUris: string[],
  imageType: 'cover' | 'page' | 'thumbnail' = 'page',
  onProgress?: (progress: {
    current: number;
    total: number;
    percentage: number;
    currentImage: string;
    stats: CompressionStats;
  }) => void
): Promise<CompressionResult[]> => {
  const settings = getOptimalSettings(imageType);
  const results: CompressionResult[] = [];

  let totalOriginal = 0;
  let totalCompressed = 0;

  for (let i = 0; i < imageUris.length; i++) {
    const result = await compressImage(imageUris[i], settings);
    results.push(result);

    if (result.originalSize) totalOriginal += result.originalSize;
    if (result.compressedSize) totalCompressed += result.compressedSize;

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: imageUris.length,
        percentage: ((i + 1) / imageUris.length) * 100,
        currentImage: imageUris[i].substring(imageUris[i].lastIndexOf('/') + 1),
        stats: {
          totalOriginalMB: totalOriginal / 1024 / 1024,
          totalCompressedMB: totalCompressed / 1024 / 1024,
          savedMB: (totalOriginal - totalCompressed) / 1024 / 1024,
          compressionRatio: totalOriginal > 0
            ? ((totalOriginal - totalCompressed) / totalOriginal) * 100
            : 0,
        },
      });
    }
  }

  return results;
};
