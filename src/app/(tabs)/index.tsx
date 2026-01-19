// src/app/(tabs)/index.tsx - FIXED: Search bar redirects on any touch (mobile & web)
// src/app/(tabs)/index.tsx - OPTIMIZED: Reduced re-renders & memoization
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  InteractionManager,
  Dimensions,
  I18nManager,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { SearchBar, AdBanner, CachedImage } from '../../components/common';
import { InterstitialAdModal } from '../../components/common/InterstitialAdModal';
import { CompactLocationSelector } from '../../components/common/CompactLocationSelector';
import { FeaturedOffers } from '../../components/home';
import { StoreCard } from '../../components/stores';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  useAppInitialization,
  usePersistBasket,
  usePersistFavorites,
  useSafeTabBarHeight,
  useInterstitialAd,
  useSmartRefresh
} from '../../hooks';
import { addToBasket } from '../../store/slices/basketSlice';
import { toggleFavoriteStore, toggleFavoriteSubcategory } from '../../store/slices/favoritesSlice';
import { loadCatalogues } from '../../store/slices/offersSlice';
import { getMainCategories } from '../../data/categories';
import { getActiveOffers } from '../../services/offerService';
import { cacheService } from '../../services/cacheService';
import { formatDateRange } from '../../utils/catalogueUtils';
import { logScreenView, logSelectContent } from '../../services/analyticsService';
import type { Category, Catalogue, Store } from '../../types';
import type { OfferWithCatalogue } from '../../services/offerService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - (spacing.md * 4)) / 3;

type CatalogueStatus = 'active' | 'upcoming' | 'expired';

interface CatalogueWithStatus extends Catalogue {
  status: CatalogueStatus;
}

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  catalogues: CatalogueWithStatus[];
}

// ✅ Helper outside component (no re-creation on renders)
const normalizeDate = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { paddingBottom } = useSafeTabBarHeight();

  const [searchQuery, setSearchQuery] = useState('');
  const [featuredOffers, setFeaturedOffers] = useState<OfferWithCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isInteractionComplete, setIsInteractionComplete] = useState(false);

  const { showAd, currentAd, checkAndShowAd, dismissAd } = useInterstitialAd();

  const isReady = useAppInitialization();
  usePersistBasket();
  usePersistFavorites();

  const stores = useAppSelector(state => state.stores.stores);
  const catalogues = useAppSelector(state => state.offers.catalogues);
  const cataloguesLoading = useAppSelector(state => state.offers.loading);
  const favoriteStoreIds = useAppSelector(state => state.favorites.storeIds);
  const favoriteSubcategoryIds = useAppSelector(state => state.favorites.subcategoryIds);
  const userGovernorate = useAppSelector(state => state.settings.userGovernorate);
  const mainCategories = getMainCategories();

  // ✅ Defer heavy work until after interactions
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsInteractionComplete(true);
    });
  }, []);

  useSmartRefresh({
    onRefresh: () => {
      loadOffers(false);
      checkAndShowAd();
    },
    cooldownMs: 5 * 60 * 1000,
    screenName: 'Home',
  });

  useEffect(() => {
    if (catalogues.length === 0 && !cataloguesLoading) {
      dispatch(loadCatalogues());
    }
  }, []);

  const loadOffers = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const offers = await getActiveOffers(forceRefresh);
      setFeaturedOffers(offers.slice(0, 6));
    } catch (error) {
      console.error('❌ [Home] Error loading offers:', error);
      setFeaturedOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOffers(true);
      await dispatch(loadCatalogues(true)).unwrap();
    } catch (error) {
      console.error('❌ [Home] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ OPTIMIZED: Depend on array LENGTH, not entire array
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    if (catalogues.length === 0) return [];

    let filtered = catalogues;
    if (userGovernorate) {
      filtered = catalogues.filter(cat => {
        if (!cat.isLocalStore) return true;
        return cat.localStoreGovernorate === userGovernorate;
      });
    }

    const withStatus: CatalogueWithStatus[] = filtered.map(cat => ({
      ...cat,
      status: cacheService.getCatalogueStatus(cat.id, cat.startDate, cat.endDate),
    }));

    const active = withStatus.filter(cat => cat.status === 'active');

    const groups: { [categoryId: string]: CategoryGroup } = {};

    active.forEach(catalogue => {
      const categoryId = catalogue.categoryId || 'general';

      if (!groups[categoryId]) {
        const category = mainCategories.find(c => c.id === categoryId);
        groups[categoryId] = {
          categoryId,
          categoryName: category?.nameAr || 'عام',
          categoryIcon: category?.icon || 'apps',
          categoryColor: category?.color || colors.primary,
          catalogues: [],
        };
      }

      groups[categoryId].catalogues.push(catalogue);
    });

    Object.values(groups).forEach(group => {
      if (group.catalogues.length > 1) {
        group.catalogues.sort((a, b) => {
          const dateA = new Date(normalizeDate(a.startDate)).getTime();
          const dateB = new Date(normalizeDate(b.startDate)).getTime();
          return dateB - dateA;
        });
      }
    });

    const groupArray = Object.values(groups);
    groupArray.sort((a, b) => {
      const orderA = mainCategories.findIndex(c => c.id === a.categoryId);
      const orderB = mainCategories.findIndex(c => c.id === b.categoryId);
      return orderA - orderB;
    });

    return groupArray;
  }, [catalogues.length, userGovernorate]); // ✅ Only when length or location changes

  // ✅ DEFERRED: Calculate top stores only after interactions complete
  const topStoresByCatalogueCount = useMemo(() => {
    if (!isInteractionComplete || categoryGroups.length === 0) return [];

    const activeCatalogues = categoryGroups.flatMap(group => group.catalogues);
    const storeCatalogueCount: Record<string, number> = {};

    activeCatalogues.forEach(cat => {
      if (cat.storeId) {
        storeCatalogueCount[cat.storeId] = (storeCatalogueCount[cat.storeId] || 0) + 1;
      }
    });

    return stores
      .map(store => ({
        store,
        catalogueCount: storeCatalogueCount[store.id] || 0,
      }))
      .filter(item => item.catalogueCount > 0)
      .sort((a, b) => b.catalogueCount - a.catalogueCount)
      .slice(0, 3)
      .map(item => item.store);
  }, [categoryGroups.length, stores.length, isInteractionComplete]);

  // ✅ All callbacks memoized
  const handleOfferPress = useCallback((offer: OfferWithCatalogue) => {
    router.push(`/offer/${offer.id}`);
  }, [router]);

  const handleAddToBasket = useCallback((offer: OfferWithCatalogue) => {
    dispatch(addToBasket({
      offer: {
        ...offer,
        storeId: offer.storeId,
        catalogueId: offer.catalogueId,
      },
      storeName: offer.storeName,
    }));
  }, [dispatch]);

  const handleToggleFavoriteSubcategory = useCallback((subcategoryId: string) => {
    dispatch(toggleFavoriteSubcategory(subcategoryId));
  }, [dispatch]);

  const handleCategoryPress = useCallback((category: Category) => {
    router.push({
      pathname: '/(tabs)/flyers',
      params: { mainCategoryId: category.id },
    });
  }, [router]);

  const handleStorePress = useCallback((storeId: string) => {
    router.push(`/store/${storeId}`);
  }, [router]);

  const handleCataloguePress = useCallback((catalogueId: string) => {
    router.push(`/flyer/${catalogueId}`);
  }, [router]);

  const handleToggleFavoriteStore = useCallback((storeId: string) => {
    dispatch(toggleFavoriteStore(storeId));
  }, [dispatch]);

  const handleSearchPress = useCallback(() => {
    router.push('/search');
  }, [router]);

  // ✅ Simple function, no memoization needed
  const getStatusBadgeStyle = (status: CatalogueStatus) => {
    switch (status) {
      case 'active': return { backgroundColor: colors.success };
      case 'upcoming': return { backgroundColor: colors.warning };
      case 'expired': return { backgroundColor: colors.gray[400] };
    }
  };

  // ✅ Simple lookup, no memoization needed
  const getStoreName = (catalogue: CatalogueWithStatus): string => {
    if (catalogue.isLocalStore) {
      if (catalogue.localStoreNameAr && catalogue.localStoreNameAr !== 'غير محدد') {
        return catalogue.localStoreNameAr;
      }
      return catalogue.titleAr;
    }

    const store = stores.find(s => s.id === catalogue.storeId);
    return store?.nameAr || catalogue.titleAr.replace('عروض ', '');
  };

  // ✅ Render functions memoized
  const renderHorizontalCategories = useCallback(() => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesScroll}
      contentContainerStyle={styles.categoriesContainer}
    >
      {mainCategories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={styles.categoryButton}
          onPress={() => handleCategoryPress(category)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.categoryIcon,
            { backgroundColor: category.color }
          ]}>
            <Ionicons
              name={category.icon as any}
              size={24}
              color={colors.white}
            />
          </View>
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {category.nameAr}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  ), [mainCategories, handleCategoryPress]);

  const renderCatalogueCard = useCallback((catalogue: CatalogueWithStatus) => {
    const storeName = getStoreName(catalogue);
    const isFavorite = favoriteStoreIds.includes(catalogue.storeId);

    return (
      <View key={catalogue.id} style={styles.catalogueThumbnailWrapper}>
        <TouchableOpacity
          style={styles.catalogueThumbnail}
          onPress={() => {
            logSelectContent('catalogue', catalogue.id);
            handleCataloguePress(catalogue.id);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.thumbnailImageContainer}>
            <CachedImage
              source={catalogue.coverImage}
              style={styles.thumbnailImage}
              contentFit="cover"
              showLoader={false}
              cachePriority="normal" // ✅ Normal priority for browsing
            />
            <View style={[styles.statusBadgeThumbnail, getStatusBadgeStyle(catalogue.status)]}>
              <View style={styles.statusDot} />
            </View>

            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleToggleFavoriteStore(catalogue.storeId)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? colors.primary : colors.white}
              />
            </TouchableOpacity>

            {catalogue.isLocalStore && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>محلي</Text>
              </View>
            )}
          </View>

          <Text style={styles.thumbnailStoreName} numberOfLines={1}>
            {storeName}
          </Text>

          <Text style={styles.thumbnailDate} numberOfLines={1}>
            {formatDateRange(normalizeDate(catalogue.startDate), normalizeDate(catalogue.endDate))}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [favoriteStoreIds, handleCataloguePress, handleToggleFavoriteStore]);

  const renderCategoryGroup = useCallback((group: CategoryGroup) => (
    <View key={group.categoryId} style={styles.categoryGroup}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryHeaderIcon, { backgroundColor: group.categoryColor }]}>
          <Ionicons name={group.categoryIcon as any} size={20} color={colors.white} />
        </View>
        <Text style={styles.categoryGroupName}>{group.categoryName}</Text>
        <Text style={styles.catalogueCount}>
          {group.catalogues.length} {group.catalogues.length === 1 ? t('home.catalogue') : t('home.catalogues')}
        </Text>
      </View>
      <View style={styles.cataloguesGrid}>
        {group.catalogues.map(renderCatalogueCard)}
      </View>
    </View>
  ), [t, renderCatalogueCard]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <TouchableOpacity
        style={styles.searchContainer}
        onPress={handleSearchPress}
        activeOpacity={0.8}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('home.searchPlaceholder')}
          editable={false}
          pointerEvents="none"
        />
      </TouchableOpacity>

      <AdBanner position="home" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.mainCategories')}</Text>
        {renderHorizontalCategories()}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.featuredOffers')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/flyers')}>
            <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>{t('home.loadingOffers')}</Text>
          </View>
        ) : featuredOffers.length > 0 ? (
          <FeaturedOffers
            offers={featuredOffers}
            onOfferPress={handleOfferPress}
            onAddToBasket={handleAddToBasket}
            favoriteSubcategoryIds={favoriteSubcategoryIds}
            onToggleFavorite={handleToggleFavoriteSubcategory}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyText}>{t('home.noActiveOffers')}</Text>
          </View>
        )}
      </View>

      {categoryGroups.length > 0 && (
        <View style={styles.section}>
          <View style={styles.locationSelectorRow}>
            <CompactLocationSelector />
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.activeCatalogues')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/flyers')}>
              <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {cataloguesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{t('home.loadingCatalogues')}</Text>
            </View>
          ) : (
            <View style={styles.cataloguesSection}>
              {categoryGroups.map(renderCategoryGroup)}
            </View>
          )}
        </View>
      )}

      {isInteractionComplete && topStoresByCatalogueCount.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.nearbyStores')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/stores')}>
              <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.storesList}>
            {topStoresByCatalogueCount.map(store => (
              <StoreCard
                key={store.id}
                store={store}
                onPress={() => handleStorePress(store.id)}
                isFavorite={favoriteStoreIds.includes(store.id)}
                onToggleFavorite={() => handleToggleFavoriteStore(store.id)}
                hideBranchCount={true}
              />
            ))}
          </View>
        </View>
      )}

      {currentAd && (
        <InterstitialAdModal
          ad={currentAd}
          visible={showAd}
          onDismiss={dismissAd}
        />
      )}
    </ScrollView>
  );
}

// Keep your existing styles...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  searchContainer: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  viewAll: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  categoriesScroll: {
    maxHeight: 100,
  },
  locationSelectorRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: I18nManager.isRTL ? 0 : spacing.md,
    marginLeft: I18nManager.isRTL ? spacing.md : 0,
    width: 70,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  storesList: {
    paddingHorizontal: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  cataloguesSection: {
    paddingHorizontal: spacing.md,
  },
  categoryGroup: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: spacing.xs,
  },
  categoryHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryGroupName: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  catalogueCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  cataloguesGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  catalogueThumbnailWrapper: {
    width: CARD_WIDTH,
  },
  catalogueThumbnail: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  thumbnailImageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  statusBadgeThumbnail: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  statusDot: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  localBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  localBadgeText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: '600',
  },
  thumbnailStoreName: {
    fontSize: 11,
    color: colors.text,
    marginTop: 5,
    textAlign: 'center',
    width: '100%',
    fontWeight: '600',
  },
  thumbnailDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
    fontWeight: '500',
  },
});