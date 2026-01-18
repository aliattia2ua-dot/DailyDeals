// src/components/common/CachedImage.tsx - Optimized image component
import React, { useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors } from '../../constants/theme';

interface CachedImageProps {
  source: string | { uri: string };
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'; // For expo-image compatibility
  placeholder?: React.ReactNode;
  showLoader?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * CachedImage component with loading state
 *
 * Note: For better caching, install expo-image and replace this implementation:
 * 1. Run:  npx expo install expo-image
 * 2. Replace the Image import and usage below
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
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get the URI from source
  const uri = typeof source === 'string' ? source : source?. uri;

  // Map contentFit to resizeMode if provided
  const getResizeMode = (): 'cover' | 'contain' | 'stretch' | 'center' => {
    if (resizeMode) return resizeMode;
    if (contentFit) {
      switch (contentFit) {
        case 'cover':
          return 'cover';
        case 'contain':
        case 'scale-down':
          return 'contain';
        case 'fill':
          return 'stretch';
        case 'none':
          return 'center';
        default:
          return 'cover';
      }
    }
    return 'cover';
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

  if (! uri) {
    return placeholder ?  <>{placeholder}</> : <View style={[styles.placeholder, style]} />;
  }

  if (error && placeholder) {
    return <>{placeholder}</>;
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri }}
        style={[styles.image, style]}
        resizeMode={getResizeMode()}
        onLoad={handleLoad}
        onError={handleError}
      />
      {loading && showLoader && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors. primary} />
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
    ... StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  placeholder: {
    backgroundColor: colors.gray[100],
  },
});

export default CachedImage;