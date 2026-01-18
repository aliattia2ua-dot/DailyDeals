// src/components/common/InterstitialAdModal.tsx
// UPDATED: Fixed date validation for ads without dates
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Text,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { InterstitialAd } from '../../types/appConfig';

interface InterstitialAdModalProps {
  ad: InterstitialAd;
  visible: boolean;
  onDismiss: () => void;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  ad,
  visible,
  onDismiss,
}) => {
  const { i18n } = useTranslation();
  const [canDismiss, setCanDismiss] = useState(false);
  const [countdown, setCountdown] = useState(ad.dismissDelay);

  useEffect(() => {
    if (visible) {
      setCanDismiss(false);
      setCountdown(ad.dismissDelay);

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanDismiss(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [visible, ad.dismissDelay]);

  const handleAdPress = async () => {
    try {
      let url = ad.targetUrl;

      // Add https:// if missing protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        onDismiss();
      } else {
        console.error('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening ad URL:', error);
    }
  };

  const title = i18n.language === 'ar' ? ad.titleAr : ad.titleEn;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canDismiss ? onDismiss : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          {canDismiss ? (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={32} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>{countdown}s</Text>
            </View>
          )}

          {/* Ad Content */}
          <TouchableOpacity
            style={styles.adContent}
            onPress={handleAdPress}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: ad.imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
            {title && (
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -16,
    right: -16,
    zIndex: 10,
  },
  countdownBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    zIndex: 10,
  },
  countdownText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  adContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: width * 0.7,
    maxHeight: 400,
  },
  title: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});