// app/(tabs)/flyers.tsx - PART 1: IMPORTS & STATE MANAGEMENT - UPDATED FOR LOCAL STORE SPLITTING + LOCATION FILTERING
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getTodayString, normalizeDateString } from '../../utils/dateUtils';
import { getOfferStats } from '../../services/offerService';
import { CompactLocationSelector, CachedImage } from '../../components/common';
import type { GovernorateId } from '../../data/stores';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { OfferCard } from '../../components/flyers';
import { AdBanner } from '../../components/common';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { addToBasket } from '../../store/slices/basketSlice';
import { toggleFavoriteSubcategory, toggleFavoriteStore } from '../../store/slices/favoritesSlice';
import { loadCatalogues } from '../../store/slices/offersSlice';
import { setCataloguesCache } from '../../data/catalogueRegistry';
import { getActiveOffers, getOffersByCategory, getAllOffers } from '../../services/offerService';
import { cacheService } from '../../services/cacheService';
import {
  getMainCategories,
  getMainSubcategories,
  getCategoryById
} from '../../data/categories';
import { formatDateRange } from '../../utils/catalogueUtils';
import { logScreenView, logSelectContent, logViewItemList } from '../../services/analyticsService';
import { useSafeTabBarHeight, useSmartRefresh } from '../../hooks';
import { stores, getStoreById, getGovernorateName } from '../../data/stores';
import type { Catalogue } from '../../types';
import type { OfferWithCatalogue } from '../../services/offerService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - (spacing.md * 4)) / 3;
const OFFER_CARD_WIDTH = (width - (spacing.md * 5)) / 3;

type FilterType = 'all' | 'active' | 'upcoming' | 'expired';
type CatalogueStatus = 'active' | 'upcoming' | 'expired';
type StoreFilterType = 'all' | string;

interface CatalogueWithStatus extends Catalogue {
  status: CatalogueStatus;
}

// Enhanced interface to handle local store splitting
interface StoreGroup {
  storeId: string;
  storeName: string;
  catalogues: CatalogueWithStatus[];
  hasActive: boolean;
  isLocal: boolean;
  localStoreNameId?: string;
  localStoreNameAr?: string;
  localStoreNameEn?: string;
}

export default function FlyersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { paddingBottom } = useSafeTabBarHeight();

  const params = useLocalSearchParams();
  const initialMainCategory = params.mainCategoryId as string | undefined;
  const initialViewModeParam = params.initialViewMode as string | undefined;
  const initialSubcategoryParam = params.initialSubcategory as string | undefined;
  const initialStoreId = params.storeId as string | undefined;

  // State management
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(initialMainCategory || null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialSubcategoryParam || null);
  const [selectedStore, setSelectedStore] = useState<StoreFilterType>(initialStoreId || 'all');
  const [showStoreFilter, setShowStoreFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'catalogues' | 'offers'>(
    initialViewModeParam === 'offers' ? 'offers' : 'catalogues'
  );
const [statusFilter, setStatusFilter] = useState<FilterType>('active');
  const [offersStatusFilter, setOffersStatusFilter] = useState<FilterType>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [offersData, setOffersData] = useState<OfferWithCatalogue[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [allOffersForStats, setAllOffersForStats] = useState<OfferWithCatalogue[]>([]);
  
  // Debounce timer ref for offer loading
  const loadOffersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redux selectors
  const catalogues = useAppSelector(state => state.offers.catalogues);
  const cataloguesLoading = useAppSelector(state => state.offers.loading);
  const favoriteSubcategoryIds = useAppSelector(state => state.favorites.subcategoryIds);
  const favoriteStoreIds = useAppSelector(state => state.favorites.storeIds);

  // 🔥 NEW: Get user location from settings
  const userGovernorate = useAppSelector(state => state.settings.userGovernorate) as GovernorateId | null;

  // Use smart refresh hook with 5-minute cooldown
  useSmartRefresh({
    onRefresh: () => {
      logScreenView('Flyers', viewMode === 'offers' ? 'FlyersOffers' : 'FlyersCatalogues');
    },
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    screenName: 'Flyers',
  });

  const mainCategories = getMainCategories();
  const mainSubcategories = useMemo(() => {
    if (selectedMainCategory) {
      return getMainSubcategories(selectedMainCategory);
    }
    return getMainSubcategories();
  }, [selectedMainCategory]);

  // Get unique stores that have catalogues - UPDATED to filter by location
  const storesWithCatalogues = useMemo(() => {
  const storeMap = new Map<string, any>();

  // 🔥 Filter catalogues by user location first
  const cataloguesToShow = userGovernorate
    ? catalogues.filter(cat => !cat.isLocalStore || cat.localStoreGovernorate === userGovernorate)
    : catalogues;

  cataloguesToShow.forEach(catalogue => {
    // For local stores, create ONE entry per governorate
    if (catalogue.isLocalStore && catalogue.localStoreGovernorate) {
      const uniqueId = `${catalogue.storeId}|${catalogue.localStoreGovernorate}`;

      if (!storeMap.has(uniqueId)) {
        // Collect all local store names for this governorate
        const localStoreNamesInGov = cataloguesToShow
          .filter(c =>
            c.isLocalStore &&
            c.storeId === catalogue.storeId &&
            c.localStoreGovernorate === catalogue.localStoreGovernorate
          )
          .map(c => c.localStoreNameAr)
          .filter((name, index, self) => name && self.indexOf(name) === index)
          .join(' , ');

        const governorateName = getGovernorateName(catalogue.localStoreGovernorate as GovernorateId);

        storeMap.set(uniqueId, {
          id: uniqueId,
          originalStoreId: catalogue.storeId,
          nameAr: `متاجر ${governorateName}`,
          nameEn: `${governorateName} Local Stores`,
          localStoreNames: localStoreNamesInGov,
          isLocal: true,
          governorate: catalogue.localStoreGovernorate,
        });
      }
    } else {
      // For national stores, use the regular store ID
      if (!storeMap.has(catalogue.storeId)) {
        const store = stores.find(s => s.id === catalogue.storeId);
        if (store) {
          storeMap.set(catalogue.storeId, {
            id: catalogue.storeId,
            originalStoreId: catalogue.storeId,
            nameAr: store.nameAr,
            nameEn: store.nameEn,
            isLocal: false,
          });
        }
      }
    }
  });

  return Array.from(storeMap.values())
    .sort((a, b) => {
      if (a.isLocal !== b.isLocal) {
        return a.isLocal ? 1 : -1;
      }
      return a.nameAr.localeCompare(b.nameAr, 'ar');
    });
}, [catalogues, userGovernorate]);

  // Set initial store filter from URL params
  useEffect(() => {
    if (initialStoreId) {
      console.log('🪧 [Flyers] Setting initial store filter:', initialStoreId);
      setSelectedStore(initialStoreId);
    }
  }, [initialStoreId]);

  // Load catalogues on mount
  useEffect(() => {
    if (catalogues.length === 0 && !cataloguesLoading) {
      dispatch(loadCatalogues());
    }
  }, []);

  // Handle params from search navigation
  useEffect(() => {
    if (initialViewModeParam === 'offers') {
      setViewMode('offers');
    }

    if (initialSubcategoryParam) {
      setSelectedSubcategory(initialSubcategoryParam);
      const subcategory = getCategoryById(initialSubcategoryParam);
      if (subcategory?.parentId) {
        setSelectedMainCategory(subcategory.parentId);
      }
    }
  }, [initialViewModeParam, initialSubcategoryParam]);

  // Load all offers for stats
  useEffect(() => {
    const loadAllOffersForStats = async () => {
      try {
        const stats = await getOfferStats();
      } catch (error) {
        console.error('❌ Error loading offers for stats:', error);
      }
    };
    loadAllOffersForStats();
  }, []);

  // Load offers when in offers view - 🔥 UPDATED to include userGovernorate with DEBOUNCING
  useEffect(() => {
    if (viewMode === 'offers') {
      // Clear existing timeout
      if (loadOffersTimeoutRef.current) {
        clearTimeout(loadOffersTimeoutRef.current);
      }
      
      // Debounce by 300ms
      loadOffersTimeoutRef.current = setTimeout(() => {
        loadOffers();
      }, 300);
      
      return () => {
        if (loadOffersTimeoutRef.current) {
          clearTimeout(loadOffersTimeoutRef.current);
        }
      };
    }
  }, [viewMode, selectedSubcategory, offersStatusFilter, selectedMainCategory, selectedStore, userGovernorate]);

  const loadOffers = async () => {
    try {
      setOffersLoading(true);
      const today = getTodayString();

      let offers: OfferWithCatalogue[];

      if (selectedSubcategory) {
        const needAllOffers = offersStatusFilter === 'all' ||
                             offersStatusFilter === 'expired' ||
                             offersStatusFilter === 'upcoming';
        offers = await getOffersByCategory(selectedSubcategory, !needAllOffers);
      } else {
        if (offersStatusFilter === 'active') {
          offers = await getActiveOffers();
        } else {
          offers = await getAllOffers();
        }
      }

      const filteredOffers = offers.filter(offer => {
        const offerStartDate = normalizeDateString(offer.catalogueStartDate);
        const offerEndDate = normalizeDateString(offer.catalogueEndDate);

        let statusMatch = true;
        if (offersStatusFilter === 'active') {
          statusMatch = offerStartDate <= today && offerEndDate >= today;
        } else if (offersStatusFilter === 'upcoming') {
          statusMatch = offerStartDate > today;
        } else if (offersStatusFilter === 'expired') {
          statusMatch = offerEndDate < today;
        }
        if (!statusMatch) return false;

        // 🔥 NEW: Filter by user location
        if (userGovernorate) {
          const catalogue = catalogues.find(c => c.id === offer.catalogueId);
          if (catalogue?.isLocalStore && catalogue.localStoreGovernorate !== userGovernorate) {
            return false;
          }
        }

        if (selectedStore !== 'all') {
          if (offer.storeId !== selectedStore) return false;
        }

        if (selectedMainCategory && !selectedSubcategory) {
          const offerCategory = getCategoryById(offer.categoryId);
          if (offerCategory?.parentId !== selectedMainCategory) return false;
        }

        return true;
      });

      setOffersData(filteredOffers);
    } catch (error) {
      console.error('❌ Error loading offers:', error);
      setOffersData([]);
    } finally {
      setOffersLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await dispatch(loadCatalogues()).unwrap();
      setCataloguesCache(result);
      const offers = await getAllOffers();
      setAllOffersForStats(offers);
      if (viewMode === 'offers') {
        await loadOffers();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  };

  // Remove inline getCatalogueStatus - use cached version from utils
  // const getCatalogueStatus = (startDate: string, endDate: string): CatalogueStatus => { ... }

 // 🔥 UPDATED: Apply location filtering to catalogues with CACHED status
 const cataloguesWithStatus: CatalogueWithStatus[] = useMemo(() => {
  let filtered = catalogues;

  // 1. Filter by main category
  if (selectedMainCategory) {
    filtered = catalogues.filter(cat => cat.categoryId === selectedMainCategory);
  }

  // 2. 🔥 NEW: Filter by user location (governorate)
  if (userGovernorate) {
    filtered = filtered.filter(cat => {
      // Always show national stores
      if (!cat.isLocalStore) return true;

      // For local stores, only show if they match the user's governorate
      return cat.localStoreGovernorate === userGovernorate;
    });
  }

  // 3. Filter by selected store (handle pipe separator for local stores)
  if (selectedStore !== 'all') {
    filtered = filtered.filter(cat => {
      // For local store filter (format: storeId|governorate)
      if (selectedStore.includes('|')) {
        const [storeId, governorate] = selectedStore.split('|');
        return cat.storeId === storeId && cat.localStoreGovernorate === governorate;
      }
      // For national stores (simple storeId)
      return cat.storeId === selectedStore;
    });
  }

  return filtered.map(cat => ({
    ...cat,
    status: cacheService.getCatalogueStatus(cat.id, cat.startDate, cat.endDate),
  }));
}, [catalogues, selectedMainCategory, selectedStore, userGovernorate]);


  // Enhanced store grouping logic to split local stores by localStoreNameId
  const storeGroups: StoreGroup[] = useMemo(() => {
    const groups: { [key: string]: StoreGroup } = {};

    cataloguesWithStatus.forEach(catalogue => {
      let groupKey: string;
      let storeName: string;
      let isLocal = false;
      let localStoreNameId: string | undefined;
      let localStoreNameAr: string | undefined;
      let localStoreNameEn: string | undefined;

      // For local stores, create unique groups per local store name
      if (catalogue.isLocalStore && catalogue.localStoreNameId) {
        // Group all unidentified stores together
        if (catalogue.localStoreNameId === 'unidentified') {
          groupKey = `${catalogue.storeId}_unidentified`;
          storeName = 'متاجر محلية أخرى';
          localStoreNameAr = 'متاجر محلية أخرى';
          localStoreNameEn = 'Other Local Stores';
        } else {
          // For identified local stores, use their specific ID
          groupKey = `${catalogue.storeId}_${catalogue.localStoreNameId}`;
          storeName = catalogue.localStoreNameAr || catalogue.titleAr;
          localStoreNameAr = catalogue.localStoreNameAr;
          localStoreNameEn = catalogue.localStoreNameEn;
        }
        isLocal = true;
        localStoreNameId = catalogue.localStoreNameId;
      } else {
        // For national stores, use regular store ID
        groupKey = catalogue.storeId;
        const store = stores.find(s => s.id === catalogue.storeId);
        storeName = store?.nameAr || catalogue.titleAr.replace('عروض ', '');
        isLocal = false;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          storeId: groupKey,
          storeName,
          catalogues: [],
          hasActive: false,
          isLocal,
          localStoreNameId,
          localStoreNameAr,
          localStoreNameEn,
        };
      }

      groups[groupKey].catalogues.push(catalogue);
      if (catalogue.status === 'active') {
        groups[groupKey].hasActive = true;
      }
    });

    const groupArray = Object.values(groups);

    // Sort: National stores first, then local stores
    groupArray.sort((a, b) => {
      if (a.isLocal !== b.isLocal) {
        return a.isLocal ? 1 : -1;
      }
      return a.storeName.localeCompare(b.storeName, 'ar');
    });

    // Sort catalogues within each group
    groupArray.forEach(group => {
      group.catalogues.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
    });

    return groupArray;
  }, [cataloguesWithStatus]);

  const filteredStoreGroups = useMemo(() => {
    let filtered = storeGroups;

    if (statusFilter !== 'all') {
      filtered = filtered.map(group => ({
        ...group,
        catalogues: group.catalogues.filter(cat => {
          if (statusFilter === 'active') return cat.status === 'active';
          if (statusFilter === 'upcoming') return cat.status === 'upcoming';
          if (statusFilter === 'expired') return cat.status === 'expired';
          return true;
        }),
      })).filter(group => group.catalogues.length > 0);
    }

    return filtered;
  }, [storeGroups, statusFilter]);

  const catalogueStats = useMemo(() => {
    const all = cataloguesWithStatus;
    return {
      all: all.length,
      active: all.filter(c => c.status === 'active').length,
      upcoming: all.filter(c => c.status === 'upcoming').length,
      expired: all.filter(c => c.status === 'expired').length,
    };
  }, [cataloguesWithStatus]);

  const offersStats = useMemo(() => {
    const today = getTodayString();
    const dataSource = (viewMode === 'offers' && offersData.length > 0)
      ? offersData
      : allOffersForStats;

    if (dataSource.length === 0) {
      return { all: 0, active: 0, upcoming: 0, expired: 0 };
    }

    let filteredForStats = dataSource;
    if (selectedStore !== 'all') {
      filteredForStats = dataSource.filter(o => o.storeId === selectedStore);
    }

    return {
      all: filteredForStats.length,
      active: filteredForStats.filter(o => {
        const start = normalizeDateString(o.catalogueStartDate);
        const end = normalizeDateString(o.catalogueEndDate);
        return start <= today && end >= today;
      }).length,
      upcoming: filteredForStats.filter(o => {
        const start = normalizeDateString(o.catalogueStartDate);
        return start > today;
      }).length,
      expired: filteredForStats.filter(o => {
        const end = normalizeDateString(o.catalogueEndDate);
        return end < today;
      }).length,
    };
  }, [offersData, allOffersForStats, viewMode, selectedStore]);

  // Event handlers
  const handleOfferPress = (offer: OfferWithCatalogue) => {
    router.push(`/offer/${offer.id}`);
  };

  const handleAddToBasket = (offer: OfferWithCatalogue) => {
    dispatch(addToBasket({
      offer: {
        ...offer,
        storeId: offer.storeId,
        catalogueId: offer.catalogueId,
      },
      storeName: offer.storeName,
    }));
  };

  const handleToggleFavoriteSubcategory = (subcategoryId: string) => {
    dispatch(toggleFavoriteSubcategory(subcategoryId));
  };

  const handleToggleFavoriteStore = (storeId: string) => {
    dispatch(toggleFavoriteStore(storeId));
  };

  const handleCataloguePress = (catalogueId: string) => {
    router.push(`/flyer/${catalogueId}`);
  };

  const handleStoreFilterPress = (storeId: StoreFilterType) => {
    setSelectedStore(storeId);
    setShowStoreFilter(false);
  };

  const getSelectedStoreName = () => {
  if (selectedStore === 'all') return t('flyers.allStores');

  if (selectedStore.includes('|')) {
    const matchingStore = storesWithCatalogues.find(s => s.id === selectedStore);
    return matchingStore ? matchingStore.nameAr : t('flyers.allStores');
  }

  const store = getStoreById(selectedStore);
  return store ? store.nameAr : t('flyers.allStores');
};

  const getStatusBadgeStyle = (status: CatalogueStatus) => {
    switch (status) {
      case 'active': return { backgroundColor: colors.success };
      case 'upcoming': return { backgroundColor: colors.warning };
      case 'expired': return { backgroundColor: colors.gray[400] };
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`status.${status}`);
  };

  // Render components
  const renderMainCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    >
      <TouchableOpacity
        style={[styles.categoryChip, !selectedMainCategory && styles.categoryChipActive]}
        onPress={() => {
          setSelectedMainCategory(null);
          setSelectedSubcategory(null);
        }}
      >
        <Text style={[styles.categoryChipText, !selectedMainCategory && styles.categoryChipTextActive]}>
          {t('categories.all')}
        </Text>
      </TouchableOpacity>
      {mainCategories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[styles.categoryChip, selectedMainCategory === category.id && styles.categoryChipActive]}
          onPress={() => {
            setSelectedMainCategory(category.id);
            setSelectedSubcategory(null);
          }}
        >
          <Ionicons
            name={category.icon as any}
            size={16}
            color={selectedMainCategory === category.id ? colors.white : colors.primary}
          />
          <Text style={[styles.categoryChipText, selectedMainCategory === category.id && styles.categoryChipTextActive]}>
            {category.nameAr}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Combined Location + Store Filter Row
  const renderLocationAndStoreFilter = () => (
    <View style={styles.locationStoreRow}>
      {/* 🔥 Location Selector */}
      <CompactLocationSelector
        onLocationChange={(governorate) => {
          console.log('📍 Location changed:', governorate);
          // Location change will trigger re-filtering via userGovernorate
        }}
      />

      {/* Store Filter Dropdown */}
      <View style={styles.storeFilterWrapper}>
        <TouchableOpacity
          style={styles.storeFilterButton}
          onPress={() => setShowStoreFilter(!showStoreFilter)}
        >
          <Ionicons name="storefront-outline" size={20} color={colors.primary} />
          <Text style={styles.storeFilterButtonText}>{getSelectedStoreName()}</Text>
          <Ionicons
            name={showStoreFilter ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.gray[400]}
          />
        </TouchableOpacity>

       {showStoreFilter && (
  <View style={styles.storeFilterDropdown}>
    <ScrollView style={styles.storeFilterScroll} showsVerticalScrollIndicator={false}>
      {/* All Stores Option */}
      <TouchableOpacity
        style={[
          styles.storeFilterItem,
          selectedStore === 'all' && styles.storeFilterItemActive,
        ]}
        onPress={() => handleStoreFilterPress('all')}
      >
        <Text
          style={[
            styles.storeFilterItemText,
            selectedStore === 'all' && styles.storeFilterItemTextActive,
          ]}
        >
          {t('flyers.allStores')}
        </Text>
        <Text
          style={[
            styles.storeFilterItemCount,
            selectedStore === 'all' && styles.storeFilterItemCountActive,
          ]}
        >
          {userGovernorate
            ? catalogues.filter(c => !c.isLocalStore || c.localStoreGovernorate === userGovernorate).length
            : catalogues.length}
        </Text>
      </TouchableOpacity>

      {/* National Stores Section */}
      {storesWithCatalogues.filter(s => !s.isLocal).length > 0 && (
        <>
          <View style={styles.storeFilterSectionHeader}>
            <Ionicons name="business" size={16} color={colors.primary} />
            <Text style={styles.storeFilterSectionTitle}>متاجر وطنية</Text>
          </View>
          {storesWithCatalogues
            .filter(s => !s.isLocal)
            .map(store => {
              const isSelected = selectedStore === store.id;
              const storeCount = catalogues.filter(c => c.storeId === store.originalStoreId).length;

              return (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeFilterItem,
                    isSelected && styles.storeFilterItemActive,
                  ]}
                  onPress={() => handleStoreFilterPress(store.id)}
                >
                  <Text
                    style={[
                      styles.storeFilterItemText,
                      isSelected && styles.storeFilterItemTextActive,
                    ]}
                  >
                    {store.nameAr}
                  </Text>
                  <Text
                    style={[
                      styles.storeFilterItemCount,
                      isSelected && styles.storeFilterItemCountActive,
                    ]}
                  >
                    {storeCount}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </>
      )}

      {/* Local Stores Section */}
      {storesWithCatalogues.filter(s => s.isLocal).length > 0 && (
        <>
          <View style={styles.storeFilterSectionHeader}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={styles.storeFilterSectionTitle}>متاجر محلية</Text>
          </View>
          {storesWithCatalogues
            .filter(s => s.isLocal)
            .map(store => {
              const isSelected = selectedStore === store.id;
              const storeCount = catalogues.filter(c =>
                c.storeId === store.originalStoreId &&
                c.localStoreGovernorate === store.governorate
              ).length;

              return (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.storeFilterItem,
                    isSelected && styles.storeFilterItemActive,
                  ]}
                  onPress={() => handleStoreFilterPress(store.id)}
                >
                  <View style={styles.storeFilterItemContent}>
                    <Text
                      style={[
                        styles.storeFilterItemText,
                        isSelected && styles.storeFilterItemTextActive,
                      ]}
                    >
                      {store.nameAr}
                    </Text>
                    {store.localStoreNames && (
                      <Text
                        style={[
                          styles.storeFilterItemSubtext,
                          isSelected && styles.storeFilterItemSubtextActive,
                        ]}
                        numberOfLines={1}
                      >
                        ({store.localStoreNames})
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.storeFilterItemCount,
                      isSelected && styles.storeFilterItemCountActive,
                    ]}
                  >
                    {storeCount}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </>
      )}
    </ScrollView>
  </View>
)}
        {selectedStore !== 'all' && (
          <TouchableOpacity
            style={styles.clearStoreFilter}
            onPress={() => setSelectedStore('all')}
          >
            <Text style={styles.clearStoreFilterText}>{t('flyers.clearFilters')}</Text>
            <Ionicons name="close-circle" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

 // flyers.tsx - PART 2: RENDER FUNCTIONS (Status Filter, View Toggle, Cards)

const renderStatusFilter = () => {
  const currentFilter = viewMode === 'catalogues' ? statusFilter : offersStatusFilter;
  const setCurrentFilter = viewMode === 'catalogues' ? setStatusFilter : setOffersStatusFilter;
  const stats = viewMode === 'catalogues' ? catalogueStats : offersStats;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContainer}
    >
      {(['all', 'active', 'upcoming', 'expired'] as FilterType[]).map((filter) => {
        const count = stats[filter];

        return (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              currentFilter === filter && styles.filterChipActive,
              filter === 'active' && currentFilter === filter && styles.filterChipActiveGreen
            ]}
            onPress={() => setCurrentFilter(filter)}
          >
            <Text style={[styles.filterChipText, currentFilter === filter && styles.filterChipTextActive]}>
              {t(`flyers.${filter}Filter`)}
              {` (${count})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const renderViewToggle = () => (
  <View style={styles.viewToggle}>
    <TouchableOpacity
      style={[styles.toggleButton, viewMode === 'catalogues' && styles.toggleButtonActive]}
      onPress={() => setViewMode('catalogues')}
    >
      <Ionicons
        name="book-outline"
        size={20}
        color={viewMode === 'catalogues' ? colors.white : colors.text}
      />
      <Text style={[styles.toggleText, viewMode === 'catalogues' && styles.toggleTextActive]}>
        {t('flyers.cataloguesView')}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.toggleButton, viewMode === 'offers' && styles.toggleButtonActive]}
      onPress={() => setViewMode('offers')}
    >
      <Ionicons
        name="grid-outline"
        size={20}
        color={viewMode === 'offers' ? colors.white : colors.text}
      />
      <Text style={[styles.toggleText, viewMode === 'offers' && styles.toggleTextActive]}>
        {t('flyers.offersView')}
      </Text>
    </TouchableOpacity>
  </View>
);

const renderCatalogueCard = (catalogue: CatalogueWithStatus) => {
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
        </View>

        <View style={styles.thumbnailInfoContainer}>
          <Text style={styles.thumbnailStoreName} numberOfLines={1}>
            {catalogue.titleAr}
          </Text>
          <Text style={styles.thumbnailSeparator}>•</Text>
          <Text style={styles.thumbnailDate} numberOfLines={1}>
            {formatDateRange(catalogue.startDate, catalogue.endDate)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const renderStoreGroup = (group: StoreGroup) => {
  const groupHeader = (
    <View style={styles.storeHeader}>
      <Ionicons
        name={group.isLocal ? 'location' : 'storefront'}
        size={20}
        color={colors.primary}
      />
      <Text style={styles.storeName}>{group.storeName}</Text>
      {group.isLocal && (
        <View style={styles.localStoreBadge}>
          <Text style={styles.localStoreBadgeText}>محلي</Text>
        </View>
      )}
      <Text style={styles.catalogueCount}>
        {group.catalogues.length} {group.catalogues.length === 1 ? t('home.catalogue') : t('home.catalogues')}
      </Text>
    </View>
  );

  return (
    <View key={group.storeId} style={styles.storeGroup}>
      {groupHeader}
      <View style={styles.cataloguesGrid}>
        {group.catalogues.map(renderCatalogueCard)}
      </View>
    </View>
  );
};

// Separate national and local store groups
const nationalStoreGroups = useMemo(() => {
  return filteredStoreGroups.filter(g => !g.isLocal);
}, [filteredStoreGroups]);

const localStoresByGovernorate = useMemo(() => {
  const localGroups = filteredStoreGroups.filter(g => g.isLocal);

  // Group by governorate
  const grouped: Record<string, StoreGroup[]> = {};

  localGroups.forEach(group => {
    // Extract governorate from catalogues
    const governorate = group.catalogues[0]?.localStoreGovernorate;
    if (governorate) {
      if (!grouped[governorate]) {
        grouped[governorate] = [];
      }
      grouped[governorate].push(group);
    }
  });

  // Sort governorates alphabetically
  const sortedGovernorates = Object.keys(grouped).sort((a, b) => {
    const nameA = getGovernorateName(a as GovernorateId);
    const nameB = getGovernorateName(b as GovernorateId);
    return nameA.localeCompare(nameB, 'ar');
  });

  // Create final sorted structure
  const result: Array<{
    governorate: GovernorateId;
    governorateName: string;
    stores: StoreGroup[]
  }> = [];

  sortedGovernorates.forEach(gov => {
    const stores = grouped[gov].sort((a, b) =>
      a.storeName.localeCompare(b.storeName, 'ar')
    );

    result.push({
      governorate: gov as GovernorateId,
      governorateName: getGovernorateName(gov as GovernorateId),
      stores,
    });
  });

  return result;
}, [filteredStoreGroups]);


// flyers.tsx - PART 3: MAIN RENDER & COMPLETE STYLES

// Main render
return (
  <View style={styles.container}>
    <ScrollView
      style={styles.fullScrollView}
      contentContainerStyle={{ paddingBottom }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <AdBanner position="flyers" />

      {renderViewToggle()}
      {renderMainCategoryFilter()}
      {renderLocationAndStoreFilter()}
      {renderStatusFilter()}

      {viewMode === 'catalogues' ? (
        <>
          {cataloguesLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('home.loadingCatalogues')}</Text>
            </View>
          )}

{!cataloguesLoading && (nationalStoreGroups.length > 0 || localStoresByGovernorate.length > 0) ? (
    <>
              {/* National Stores Section */}
              {nationalStoreGroups.length > 0 && (
                <View style={styles.section}>
                  {nationalStoreGroups.map(renderStoreGroup)}
                </View>
              )}

{localStoresByGovernorate.length > 0 && (
  <View style={styles.section}>
    <View style={styles.sectionDivider}>
      <View style={styles.dividerLine} />
      <View style={styles.sectionHeaderWithIcon}>
        <Ionicons name="location" size={24} color={colors.primary} />
        <Text style={styles.sectionHeaderText}>المتاجر المحلية</Text>
      </View>
      <View style={styles.dividerLine} />
    </View>

    {localStoresByGovernorate.map(({ governorate, governorateName, stores }) => (
      <View key={governorate} style={styles.governorateSection}>
        {/* Governorate Header */}
        <View style={styles.governorateHeader}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.governorateName}>{governorateName}</Text>
          <Text style={styles.governorateCount}>
            ({stores.reduce((sum, store) => sum + store.catalogues.length, 0)} كتالوج)
          </Text>
        </View>

        {/* Stores in this governorate */}
        {stores.map(renderStoreGroup)}
      </View>
    ))}
  </View>
)}
            </>
          ) : !cataloguesLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.gray[300]} />
              <Text style={styles.emptyStateText}>
                {t('flyers.noOffers')} {statusFilter !== 'all' ? getStatusLabel(statusFilter) : ''}
              </Text>
              {userGovernorate && (
                <Text style={styles.emptyStateSubtext}>
                  لا توجد كتالوجات في موقعك المحدد
                </Text>
              )}
              {selectedStore !== 'all' && (
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={() => setSelectedStore('all')}
                >
                  <Text style={styles.emptyActionText}>{t('flyers.allStores')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </>
      ) : (
        <>
          {offersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('flyers.loadingOffers')}</Text>
            </View>
          ) : offersData.length > 0 ? (
            <View style={styles.offersWrapper}>
              {offersData.map((item) => (
                <View key={item.id} style={styles.offerCardWrapper}>
                  <OfferCard
                    offer={item}
                    onPress={() => handleOfferPress(item)}
                    onAddToBasket={() => handleAddToBasket(item)}
                    isFavorite={favoriteSubcategoryIds.includes(item.categoryId)}
                    onToggleFavorite={() => handleToggleFavoriteSubcategory(item.categoryId)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={64} color={colors.gray[300]} />
              <Text style={styles.emptyStateText}>
                {t('flyers.noOffers')} {selectedSubcategory ? t('flyers.noOffersInCategory') : offersStatusFilter !== 'all' ? getStatusLabel(offersStatusFilter) : ''}
              </Text>
              <Text style={styles.emptyStateSubtext}>{t('flyers.tryChangeFilters')}</Text>
              {selectedStore !== 'all' && (
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={() => setSelectedStore('all')}
                >
                  <Text style={styles.emptyActionText}>{t('flyers.allStores')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  </View>
);
}

// COMPLETE STYLES
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
  filterScroll: {
    maxHeight: 60,
    marginBottom: spacing.sm,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipActiveGreen: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  categoryScroll: {
    maxHeight: 60,
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    minHeight: 36,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  storeFilterItemContent: {
    flex: 1,
    marginRight: I18nManager.isRTL ? 0 : spacing.sm,
    marginLeft: I18nManager.isRTL ? spacing.sm : 0,
  },
  storeFilterItemSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  storeFilterItemSubtextActive: {
    color: colors.primary + 'CC',
  },
  locationStoreRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  storeFilterWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  storeFilterButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.sm,
    minHeight: 44,
  },
  storeFilterButtonText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '500',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  storeFilterDropdown: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeFilterScroll: {
    maxHeight: 380,
  },
  storeFilterSectionHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  storeFilterSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
    color: colors.primary,
  },
  governorateSection: {
  marginBottom: spacing.xl,
},
governorateHeader: {
  flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  alignItems: 'center',
  backgroundColor: colors.primaryLight + '15',
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderRadius: borderRadius.md,
  marginBottom: spacing.md,
  gap: spacing.xs,
  borderLeftWidth: 4,
  borderLeftColor: colors.primary,
},
governorateName: {
  flex: 1,
  fontSize: typography.fontSize.lg,
  fontWeight: 'bold',
  color: colors.primary,
  textAlign: I18nManager.isRTL ? 'right' : 'left',
},
governorateCount: {
  fontSize: typography.fontSize.sm,
  color: colors.primary,
  backgroundColor: colors.white,
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: borderRadius.full,
  fontWeight: '600',
},
  storeFilterItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    minHeight: 48,
  },
  storeFilterItemActive: {
    backgroundColor: colors.primaryLight + '10',
  },
  storeFilterItemText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  storeFilterItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  storeFilterItemCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
  storeFilterItemCountActive: {
    backgroundColor: colors.primary + '20',
    color: colors.primary,
    fontWeight: '600',
  },
  clearStoreFilter: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  clearStoreFilterText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionDivider: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    marginHorizontal: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  sectionHeaderWithIcon: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  sectionHeaderText: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  storeGroup: {
    marginBottom: spacing.lg,
  },
  storeHeader: {
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
  storeName: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  localStoreBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  localStoreBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
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
  width: 14,        // Increased from 10
  height: 14,       // Increased from 10
  borderRadius: 7,  // Half of width/height
  borderWidth: 2,   // Increased from 1.5
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
  },
  thumbnailStoreName: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
    maxWidth: '45%',
  },
  fullScrollView: {
    flex: 1,
  },
  thumbnailInfoContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 5,
    gap: 4,
    flexWrap: 'wrap',
  },
  thumbnailSeparator: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  thumbnailDate: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  offersWrapper: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  offerCardWrapper: {
    width: '32%',
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyActionButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  emptyActionText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: '600',
  },
});