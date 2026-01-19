// src/app/(tabs)/stores.tsx - FIXED LOCAL STORE FILTERING
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { StoreCard } from '../../components/stores';
import { LocationSelector } from '../../components/common';
import { useAppSelector } from '../../store/hooks';
import { useSafeTabBarHeight } from '../../hooks';
import { logScreenView, logSelectContent } from '../../services/analyticsService';
import {
  getAllBranches,
  type GovernorateId,
  type CityId
} from '../../data/stores';

type ViewMode = 'list' | 'map';
type StoreFilter = 'all' | 'national' | 'local';

export default function StoresScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { paddingBottom } = useSafeTabBarHeight();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');

  const stores = useAppSelector(state => state.stores.stores);
  const userGovernorate = useAppSelector(state => state.settings.userGovernorate) as GovernorateId | null;
  const userCity = useAppSelector(state => state.settings.userCity) as CityId | null;

  useFocusEffect(
    useCallback(() => {
      logScreenView('Stores');
    }, [])
  );

  // Filter stores based on location and filter type
  const filteredStores = useMemo(() => {
    let result = [...stores];
    const allBranches = getAllBranches();

    // Apply store type filter first
    if (storeFilter === 'national') {
      result = result.filter(s => !s.isLocal);
    } else if (storeFilter === 'local') {
      result = result.filter(s => s.isLocal);
    }

    // Apply location filter
    result = result.map(store => {
      let branches = allBranches.filter(b => b.storeId === store.id);

      // ✅ FIX: For local stores, match by governorate field instead of branches
      if (store.isLocal) {
        if (userGovernorate) {
          // Only show if store's governorate matches user's governorate
          if (store.governorate !== userGovernorate) {
            return { ...store, branches: [], _shouldHide: true };
          }
        }

        // Filter branches if they exist (for local stores with branch data)
        if (branches.length > 0) {
          branches = branches.filter(b => b.governorate === userGovernorate);
          if (userCity) {
            branches = branches.filter(b => b.city === userCity);
          }
        }

        return { ...store, branches };
      }

      // For national stores, filter by user location if set
      if (!store.isLocal && userGovernorate) {
        branches = branches.filter(b => b.governorate === userGovernorate);
        if (userCity) {
          branches = branches.filter(b => b.city === userCity);
        }
      }

      return { ...store, branches };
    });

    // ✅ FIX: Only remove local stores if they're marked as shouldHide
    result = result.filter(store => !(store as any)._shouldHide);

    // Sort: National stores first, then local stores
    result.sort((a, b) => {
      if (a.isLocal === b.isLocal) return 0;
      return a.isLocal ? 1 : -1;
    });

    return result;
  }, [stores, userGovernorate, userCity, storeFilter]);

  const handleStorePress = (storeId: string) => {
    logSelectContent('store', storeId);
    router.push(`/store/${storeId}`);
  };

  const renderViewToggle = () => (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
        onPress={() => setViewMode('list')}
      >
        <Ionicons
          name="list"
          size={20}
          color={viewMode === 'list' ? colors.white : colors.text}
        />
        <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
          {t('stores.listView')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
        onPress={() => setViewMode('map')}
      >
        <Ionicons
          name="map"
          size={20}
          color={viewMode === 'map' ? colors.white : colors.text}
        />
        <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
          {t('stores.mapView')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStoreFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[styles.filterChip, storeFilter === 'all' && styles.filterChipActive]}
          onPress={() => setStoreFilter('all')}
        >
          <Text style={[styles.filterChipText, storeFilter === 'all' && styles.filterChipTextActive]}>
            الكل
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, storeFilter === 'national' && styles.filterChipActive]}
          onPress={() => setStoreFilter('national')}
        >
          <Ionicons
            name="business"
            size={16}
            color={storeFilter === 'national' ? colors.white : colors.text}
          />
          <Text style={[styles.filterChipText, storeFilter === 'national' && styles.filterChipTextActive]}>
            متاجر وطنية
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, storeFilter === 'local' && styles.filterChipActive]}
          onPress={() => setStoreFilter('local')}
        >
          <Ionicons
            name="location"
            size={16}
            color={storeFilter === 'local' ? colors.white : colors.text}
          />
          <Text style={[styles.filterChipText, storeFilter === 'local' && styles.filterChipTextActive]}>
            متاجر محلية
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderStoresList = () => {
    const nationalStores = filteredStores.filter(s => !s.isLocal);
    const localStores = filteredStores.filter(s => s.isLocal);

    return (
      <ScrollView
        style={styles.storesList}
        contentContainerStyle={{ paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.locationContainer}>
          <LocationSelector showCitySelection={true} />
        </View>

        {renderStoreFilter()}

        {userGovernorate && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoBannerText}>
              {userCity
                ? `عرض المتاجر في ${userCity}`
                : `عرض المتاجر في ${userGovernorate}`
              }
            </Text>
          </View>
        )}

        {(storeFilter === 'all' || storeFilter === 'national') && nationalStores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>متاجر وطنية</Text>
              <Text style={styles.storeCount}>
                {nationalStores.length} {nationalStores.length === 1 ? 'متجر' : 'متاجر'}
              </Text>
            </View>

            {nationalStores.map(store => (
              <StoreCard
                key={store.id}
                store={store}
                onPress={() => handleStorePress(store.id)}
              />
            ))}
          </View>
        )}

        {(storeFilter === 'all' || storeFilter === 'local') && localStores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>متاجر محلية</Text>
              <Text style={styles.storeCount}>
                {localStores.length} {localStores.length === 1 ? 'متجر' : 'متاجر'}
              </Text>
            </View>

            {localStores.map(store => (
              <StoreCard
                key={store.id}
                store={store}
                onPress={() => handleStorePress(store.id)}
              />
            ))}
          </View>
        )}

        {filteredStores.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyText}>
              {userGovernorate
                ? 'لا توجد متاجر في موقعك المحدد'
                : 'لا توجد متاجر متاحة'
              }
            </Text>
            {userGovernorate && (
              <Text style={styles.emptySubtext}>
                جرب تغيير الموقع أو نوع المتجر
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={64} color={colors.gray[300]} />
        <Text style={styles.mapPlaceholderText}>
          {t('stores.mapViewComingSoon')}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t('stores.title'),
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        {renderViewToggle()}
        {viewMode === 'list' ? renderStoresList() : renderMapView()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  viewToggle: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    margin: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  toggleTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  storesList: {
    flex: 1,
  },
  locationContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  filterContainer: {
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  infoBanner: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  storeCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  mapPlaceholderText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});