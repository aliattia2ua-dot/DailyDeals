// app/store/[id].tsx - FIXED: Logo alignment for RTL
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';

import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Button, CachedImage } from '../../components/common';
import { LeafletMap } from '../../components/stores';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useLocalized } from '../../hooks';
import { toggleFavoriteStore } from '../../store/slices/favoritesSlice';
import { getStoreById, getBranchesByStore } from '../../data/stores';
import { logScreenView, logSelectContent } from '../../services/analyticsService';

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { getName, getAddress } = useLocalized();

  const favoriteStoreIds = useAppSelector(state => state.favorites.storeIds);

  const store = getStoreById(id);
  const branches = store ? getBranchesByStore(store.id) : [];
  const isFavorite = store ? favoriteStoreIds.includes(store.id) : false;

  // Analytics: Log screen view on mount
  useEffect(() => {
    if (id && store) {
      logScreenView('StoreDetail', id);
    }
  }, [id, store?.id]);

  if (!store) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>المتجر غير موجود</Text>
        <Button title="العودة" onPress={() => router.back()} />
      </View>
    );
  }

  const handleToggleFavorite = () => {
    dispatch(toggleFavoriteStore(store.id));
  };

  const handleViewCatalogues = () => {
    logSelectContent('store_catalogues', store.id, { store_name: getName(store) });
    router.push({
      pathname: '/(tabs)/flyers',
      params: { storeId: store.id }
    });
  };

  const handleGetDirections = (latitude: number, longitude: number) => {
    const url = `http://maps.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('خطأ', 'لا يمكن فتح الخرائط');
    });
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('خطأ', 'لا يمكن إجراء المكالمة');
    });
  };

  // ✅ Handle both require() and URI logos
  const getLogoSource = () => {
    if (typeof store.logo === 'string') {
      return { uri: store.logo };
    }
    return store.logo;
  };

  // Get governorate display name
  const getGovernorateDisplay = () => {
    if (store.isLocal && store.governorate) {
      const governorateNames: Record<string, string> = {
        sharkia: 'الشرقية',
        dakahlia: 'الدقهلية',
        cairo: 'القاهرة',
      };
      return governorateNames[store.governorate] || store.governorate;
    }
    return null;
  };

  const governorateDisplay = getGovernorateDisplay();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: getName(store),
          headerBackTitle: 'عودة',
          headerRight: () => (
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerButton}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? colors.primary : colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Store Header */}
        <View style={styles.header}>
          {/* ✅ FIXED: Logo container with proper centering */}
          <View style={styles.logoContainer}>
            <CachedImage
              source={getLogoSource()}
              style={styles.storeLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.storeName}>{getName(store)}</Text>
            <Text style={styles.branchCount}>
              {branches.length} {branches.length === 1 ? 'فرع' : 'فروع'}
              {governorateDisplay && ` في ${governorateDisplay}`}
            </Text>
            {store.isLocal && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>متاجر محلية</Text>
              </View>
            )}
          </View>
        </View>

        {/* View Catalogues Button */}
        <TouchableOpacity style={styles.catalogueButton} onPress={handleViewCatalogues}>
          <Ionicons name="book-outline" size={24} color={colors.primary} />
          <View style={styles.catalogueButtonContent}>
            <Text style={styles.catalogueButtonTitle}>عرض الكتالوجات</Text>
            <Text style={styles.catalogueButtonSubtitle}>
              شاهد جميع العروض المتاحة
            </Text>
          </View>
          <Ionicons
            name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
            size={24}
            color={colors.gray[400]}
          />
        </TouchableOpacity>

        {/* Map - Only show if branches have coordinates */}
        {branches.some(b => b.latitude && b.longitude) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>مواقع الفروع</Text>
            <LeafletMap branches={branches} height={200} />
          </View>
        )}

        {/* Branches List */}
        {branches.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              الفروع ({branches.length})
            </Text>
            {branches.map(branch => (
              <View key={branch.id} style={styles.branchCard}>
                <View style={styles.branchInfo}>
                  {store.isLocal && branch.storeName && (
                    <Text style={styles.branchStoreName}>{branch.storeName}</Text>
                  )}
                  <Text style={styles.branchAddress}>{getAddress(branch)}</Text>
                  <View style={styles.branchDetails}>
                    <Ionicons name="time-outline" size={14} color={colors.success} />
                    <Text style={styles.branchHours}>{branch.openingHours}</Text>
                  </View>
                </View>
                <View style={styles.branchActions}>
                  {branch.phone && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCall(branch.phone!)}
                    >
                      <Ionicons name="call" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  {branch.latitude && branch.longitude && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleGetDirections(branch.latitude!, branch.longitude!)}
                    >
                      <Ionicons name="navigate" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noBranchesContainer}>
            <Ionicons name="location-outline" size={48} color={colors.gray[400]} />
            <Text style={styles.noBranchesText}>
              لا توجد فروع مسجلة لهذا المتجر حالياً
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  headerButton: {
    padding: spacing.sm,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  // ✅ FIXED: Logo container with proper centering
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
    marginRight: I18nManager.isRTL ? 0 : spacing.md,
    marginLeft: I18nManager.isRTL ? spacing.md : 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  storeLogo: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: typography.fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  branchCount: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  localBadge: {
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  localBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    fontWeight: '600',
  },
  catalogueButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  catalogueButtonContent: {
    flex: 1,
    marginLeft: I18nManager.isRTL ? 0 : spacing.md,
    marginRight: I18nManager.isRTL ? spacing.md : 0,
  },
  catalogueButtonTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  catalogueButtonSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  branchCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  branchInfo: {
    flex: 1,
  },
  branchStoreName: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  branchAddress: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    marginBottom: spacing.xs,
  },
  branchDetails: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
  },
  branchHours: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    marginLeft: I18nManager.isRTL ? 0 : spacing.xs,
    marginRight: I18nManager.isRTL ? spacing.xs : 0,
  },
  branchActions: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: I18nManager.isRTL ? 0 : spacing.sm,
    marginRight: I18nManager.isRTL ? spacing.sm : 0,
  },
  noBranchesContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
  },
  noBranchesText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});