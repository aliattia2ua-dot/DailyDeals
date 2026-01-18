// src/components/common/AnnouncementBar.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { dismissAnnouncement } from '../../store/slices/appConfigSlice';
import { shouldShowAnnouncement } from '../../services/appConfigService';

export const AnnouncementBar: React.FC = () => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const config = useAppSelector((state) => state.appConfig.config);
  const dismissed = useAppSelector((state) => state.appConfig.announcementDismissed);

  if (!shouldShowAnnouncement(config) || dismissed) {
    return null;
  }

  const { type, dismissible, message, action, priority } = config.announcementBar;
  const currentMessage = i18n.language === 'ar' ? message.ar : message.en;

  const handleDismiss = () => {
    if (dismissible) {
      dispatch(dismissAnnouncement());
    }
  };

  const handleAction = async () => {
    if (!action) return;

    if (action.url) {
      try {
        await Linking.openURL(action.url);
      } catch (error) {
        console.error('❌ Failed to open URL:', error);
      }
    } else if (action.route) {
      router.push(action.route as any);
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'success':
        return colors.success;
      case 'info':
      default:
        return colors.primary;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'success':
        return 'checkmark-circle';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const actionLabel = action
    ? i18n.language === 'ar'
      ? action.label.ar
      : action.label.en
    : null;

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.content}>
        <Ionicons
          name={getIcon()}
          size={20}
          color={colors.white}
          style={styles.icon}
        />
        
        <Text style={styles.message} numberOfLines={2}>
          {currentMessage}
        </Text>

        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAction}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}

        {dismissible && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1000,
  },
  content: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    marginRight: I18nManager.isRTL ? 0 : spacing.xs,
    marginLeft: I18nManager.isRTL ? spacing.xs : 0,
  },
  message: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: '500',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.white,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
});
