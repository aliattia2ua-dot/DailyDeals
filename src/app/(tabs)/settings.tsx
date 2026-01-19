// src/app/(tabs)/settings.tsx - WITH COMPACT LOCATION SELECTOR
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  I18nManager,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { CompactLocationSelector } from '../../components/common/CompactLocationSelector';
import { setLanguage, setNotificationsEnabled } from '../../store/slices/settingsSlice';
import { signOut, clearUser } from '../../store/slices/authSlice';
import { clearBasket } from '../../store/slices/basketSlice';
import { clearFavorites } from '../../store/slices/favoritesSlice';
import { changeLanguage } from '../../i18n';
import { usePersistSettings, useSafeTabBarHeight } from '../../hooks';
import { APP_CONFIG } from '../../constants/config';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { paddingBottom } = useSafeTabBarHeight();

  usePersistSettings();

  const settings = useAppSelector(state => state.settings);
  const stores = useAppSelector(state => state.stores.stores);
  const favoriteStoreIds = useAppSelector(state => state.favorites.storeIds);
  const favoriteSubcategoryIds = useAppSelector(state => state.favorites.subcategoryIds);
  const { user, isAuthenticated, isAdmin } = useAppSelector(state => state.auth);

  const handleLanguageChange = async (language: 'ar' | 'en') => {
    await changeLanguage(language);
    dispatch(setLanguage(language));

    if ((language === 'ar') !== I18nManager.isRTL) {
      Alert.alert(
        t('settings.warning'),
        t('settings.languageChangeHint'),
        [{ text: t('settings.ok') }]
      );
    }
  };

  const handleNotificationsToggle = () => {
    dispatch(setNotificationsEnabled(!settings.notificationsEnabled));
  };

  const handleSignIn = () => {
    router.push('/auth/sign-in');
  };

  const handleSignOut = async () => {
    console.log('🔴 [Settings] Sign out initiated');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('settings.signOutConfirm'));
      if (!confirmed) {
        console.log('🔴 [Settings] User cancelled sign out');
        return;
      }
    } else {
      Alert.alert(
        t('settings.signOut'),
        t('settings.signOutConfirm'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => console.log('🔴 [Settings] User cancelled sign out'),
          },
          {
            text: t('settings.signOut'),
            style: 'destructive',
            onPress: () => performSignOut(),
          },
        ]
      );
      return;
    }

    await performSignOut();
  };

  const performSignOut = async () => {
    try {
      console.log('🔵 [Settings] Performing sign out');

      await dispatch(signOut()).unwrap();
      console.log('✅ [Settings] Sign out successful');

      dispatch(clearUser());
      dispatch(clearBasket());
      dispatch(clearFavorites());

      router.replace('/auth/sign-in');

      setTimeout(() => {
        if (Platform.OS === 'web') {
          alert(t('settings.signOutSuccess'));
        } else {
          Alert.alert(t('common.success'), t('settings.signOutSuccess'));
        }
      }, 500);
    } catch (error: any) {
      console.error('❌ [Settings] Sign out error:', error);

      if (Platform.OS === 'web') {
        alert(`${t('common.error')}: ${error.message || t('common.failed')}`);
      } else {
        Alert.alert(t('common.error'), error.message || t('common.failed'));
      }
    }
  };

  const handleAdminPanel = () => {
    console.log('🔵 [Settings] Navigating to admin panel');
    router.push('/admin/dashboard');
  };

  const handleStores = () => {
    console.log('🏪 [Settings] Navigating to stores');
    router.push('/(tabs)/stores');
  };

  const renderSettingItem = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle?: string,
    rightElement?: React.ReactNode,
    onPress?: () => void
  ) => {
    return (
      <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement || (onPress && (
          <Ionicons
            name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
            size={24}
            color={colors.gray[400]}
          />
        ))}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <View style={styles.card}>
          {isAuthenticated && user ? (
            <>
              {/* User Profile - Clickable */}
              <TouchableOpacity
                style={styles.profileContainer}
                onPress={() => router.push('/profile')}
                activeOpacity={0.7}
              >
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={32} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user.displayName || t('settings.user')}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  {isAdmin && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={colors.white} />
                      <Text style={styles.adminBadgeText}>{t('settings.admin')}</Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={24}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>

              {/* Admin-only tools */}
              {isAdmin && (
                <>
                  <View style={styles.divider} />

                  {renderSettingItem(
                    'analytics-outline',
                    t('settings.cacheMonitor'),
                    t('settings.cacheMonitorDesc'),
                    undefined,
                    () => router.push('/cache-debug')
                  )}


{renderSettingItem(
  'speedometer-outline',
  t('settings.performanceMonitor'),
  'Track app performance and transitions',
  undefined,
  () => router.push('/perf-debug')
)}
                  <View style={styles.divider} />

                  {renderSettingItem(
                    'settings',
                    t('settings.adminPanel'),
                    t('settings.adminPanelDesc'),
                    undefined,
                    handleAdminPanel
                  )}
                </>
              )}

              {/* Sign Out Button */}
              {renderSettingItem(
                'log-out',
                t('settings.signOut'),
                undefined,
                undefined,
                handleSignOut
              )}
            </>
          ) : (
            /* Sign In Button */
            renderSettingItem(
              'log-in',
              t('settings.signIn'),
              t('settings.signInHint'),
              undefined,
              handleSignIn
            )
          )}
        </View>
      </View>

      {/* Location Section - COMPACT VERSION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.location')}</Text>
        <View style={styles.card}>
          <View style={styles.locationContainer}>
            <CompactLocationSelector />
          </View>
          <View style={styles.locationHint}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.locationHintText}>
              {t('settings.locationHint')}
            </Text>
          </View>
        </View>
      </View>



      {/* Shopping Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.shopping')}</Text>
        <View style={styles.card}>
          {renderSettingItem(
            'storefront',
            t('stores.title'),
            `${stores.length} ${stores.length === 1 ? t('stores.store') : t('settings.storesAvailable')}`,
            undefined,
            handleStores
          )}
        </View>
      </View>

      {/* Favorites Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.favorites')}</Text>
        <View style={styles.card}>
          {renderSettingItem(
            'heart',
            t('settings.favorites'),
            `${favoriteStoreIds.length} ${favoriteStoreIds.length === 1 ? t('favorites.store') : t('favorites.stores')} • ${favoriteSubcategoryIds.length} ${favoriteSubcategoryIds.length === 1 ? t('favorites.category') : t('favorites.categories')}`,
            undefined,
            () => router.push('/(tabs)/favorites')
          )}
        </View>
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[
              styles.languageOption,
              i18n.language === 'ar' && styles.languageOptionActive,
            ]}
            onPress={() => handleLanguageChange('ar')}
          >
            <Text
              style={[
                styles.languageText,
                i18n.language === 'ar' && styles.languageTextActive,
              ]}
            >
              {t('settings.arabic')}
            </Text>
            {i18n.language === 'ar' && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={[
              styles.languageOption,
              i18n.language === 'en' && styles.languageOptionActive,
            ]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text
              style={[
                styles.languageText,
                i18n.language === 'en' && styles.languageTextActive,
              ]}
            >
              {t('settings.english')}
            </Text>
            {i18n.language === 'en' && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
        <View style={styles.card}>
          {renderSettingItem(
            'notifications',
            t('settings.notificationsEnabled'),
            undefined,
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
              thumbColor={settings.notificationsEnabled ? colors.primary : colors.gray[100]}
            />
          )}
          <View style={styles.divider} />
          {renderSettingItem(
            'settings',
            t('settings.notificationSettings'),
            undefined,
            undefined,
            () => Alert.alert(t('settings.comingSoon'), t('settings.inDevelopment'))
          )}
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.card}>
          {renderSettingItem(
            'help-circle',
            t('settings.help'),
            undefined,
            undefined,
            () => Alert.alert(t('settings.help'), t('settings.helpDesc'))
          )}
          <View style={styles.divider} />
          {renderSettingItem(
            'document-text',
            t('settings.privacyPolicy'),
            undefined,
            undefined,
            () => Alert.alert(t('settings.comingSoon'), t('settings.privacyPolicyDesc'))
          )}
          <View style={styles.divider} />
          {renderSettingItem(
            'document',
            t('settings.termsOfService'),
            undefined,
            undefined,
            () => Alert.alert(t('settings.comingSoon'), t('settings.termsOfServiceDesc'))
          )}
          <View style={styles.divider} />
          {renderSettingItem(
            'information-circle',
            t('settings.version'),
            APP_CONFIG.version
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: I18nManager.isRTL ? 0 : spacing.md,
    marginLeft: I18nManager.isRTL ? spacing.md : 0,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  settingSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginLeft: I18nManager.isRTL ? 0 : 72,
    marginRight: I18nManager.isRTL ? 72 : 0,
  },
  locationContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  locationHint: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.gray[50],
  },
  locationHintText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  languageOption: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  languageOptionActive: {
    backgroundColor: colors.primaryLight + '10',
  },
  languageText: {
    fontSize: typography.fontSize.lg,
    color: colors.text,
  },
  languageTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  profileContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: I18nManager.isRTL ? 0 : spacing.md,
    marginLeft: I18nManager.isRTL ? spacing.md : 0,
  },
  avatarPlaceholder: {
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  profileEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  adminBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    marginTop: spacing.xs,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
});