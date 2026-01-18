// src/components/common/ForceUpdateModal.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface ForceUpdateModalProps {
  visible: boolean;
  message: { ar: string; en: string };
  updateUrl: {
    ios: string;
    android: string;
    web: string;
  };
  forceUpdate: boolean; // If true, no dismiss button
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  visible,
  message,
  updateUrl,
  forceUpdate,
}) => {
  const { i18n } = useTranslation();

  const currentMessage = i18n.language === 'ar' ? message.ar : message.en;

  const handleUpdate = async () => {
    let url = updateUrl.web;

    if (Platform.OS === 'ios') {
      url = updateUrl.ios;
    } else if (Platform.OS === 'android') {
      url = updateUrl.android;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error('❌ Cannot open URL:', url);
      }
    } catch (error) {
      console.error('❌ Error opening URL:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="download-outline" size={64} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {i18n.language === 'ar' ? 'تحديث متاح' : 'Update Available'}
          </Text>

          {/* Message */}
          <Text style={styles.message}>{currentMessage}</Text>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <Ionicons name="download" size={20} color={colors.white} />
            <Text style={styles.updateButtonText}>
              {i18n.language === 'ar' ? 'تحديث الآن' : 'Update Now'}
            </Text>
          </TouchableOpacity>

          {/* Later Button (only if not force update) */}
          {!forceUpdate && (
            <TouchableOpacity
              style={styles.laterButton}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <Text style={styles.laterButtonText}>
                {i18n.language === 'ar' ? 'لاحقاً' : 'Later'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Force update warning */}
          {forceUpdate && (
            <Text style={styles.forceWarning}>
              {i18n.language === 'ar'
                ? 'التحديث مطلوب للاستمرار'
                : 'Update required to continue'}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  updateButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.white,
  },
  laterButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  laterButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  forceWarning: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
});
