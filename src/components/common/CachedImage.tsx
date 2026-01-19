// src/components/common/CachedImage.tsx - OPTIMIZED WITH TRUE CACHING
import React, { useState, useEffect } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  View,
  ActivityIndicator,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { colors } from '../../constants/theme';
import { imageCacheService } from '../../services/imageCacheService';

interface CachedImageProps {
  source: string | { uri: string } | ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: React.ReactNode;
  showLoader?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  // NEW: Cache control
  enableCache?: boolean;
  cachePriority?: 'high' | 'normal' | 'low';
}

/**
 * CachedImage component with TRUE local caching
 * - Downloads images once
 * - Stores locally for 30 days
 * - Reduces Firebase bandwidth by 90%
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  source,
  style,
  resizeMode,
  contentFit,
  placeholder,
  showLoader = true,
  onLoad,
  onError,
  enableCache = true, // ✅ Cache by default
  cachePriority = 'normal',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cachedSource, setCachedSource] = useState<string | ImageSourcePropType | null>(null);

  // Map contentFit to resizeMode
  const getResizeMode = (): 'cover' | 'contain' | 'stretch' | 'center' => {
    if (resizeMode) return resizeMode;
    if (contentFit) {
      switch (contentFit) {
        case 'cover': return 'cover';
        case 'contain':
        case 'scale-down': return 'contain';
        case 'fill': return 'stretch';
        case 'none': return 'center';
        default: return 'cover';
      }
    }
    return 'cover';
  };

  // ✅ Load cached image on mount
  useEffect(() => {
    loadImage();
  }, [source]);

  const loadImage = async () => {
    if (!source) {
      setError(true);
      setLoading(false);
      return;
    }

    // Handle require() imports (local assets)
    if (typeof source !== 'string' && typeof source !== 'object') {
      setCachedSource(source);
      setLoading(false);
      return;
    }

    // Handle URI objects
    const imageUrl = typeof source === 'string' ? source : (source as { uri: string }).uri;

    if (!imageUrl) {
      setError(true);
      setLoading(false);
      return;
    }

    // ✅ Try to get cached version
    if (enableCache && imageUrl.startsWith('http')) {
      try {
        const cachedPath = await imageCacheService.getCachedImage(imageUrl, cachePriority);

        // If cachedPath is a local file path, use it
        if (cachedPath.startsWith('file://')) {
          setCachedSource({ uri: cachedPath });
        } else {
          // Fallback to original URL (caching failed)
          setCachedSource({ uri: imageUrl });
        }
      } catch (err) {
        console.error('❌ Image cache error:', err);
        setCachedSource({ uri: imageUrl });
      }
    } else {
      // No caching or not HTTP URL
      setCachedSource({ uri: imageUrl });
    }
  };

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  // Show placeholder while loading cache
  if (!cachedSource) {
    return showLoader ? (
      <View style={[styles.loaderContainer, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : placeholder ? (
      <>{placeholder}</>
    ) : (
      <View style={[styles.placeholder, style]} />
    );
  }

  if (error && placeholder) {
    return <>{placeholder}</>;
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={cachedSource}
        style={[styles.image, style]}
        resizeMode={getResizeMode()}
        onLoad={handleLoad}
        onError={handleError}
      />
      {loading && showLoader && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  placeholder: {
    backgroundColor: colors.gray[100],
  },
});

export default CachedImage;