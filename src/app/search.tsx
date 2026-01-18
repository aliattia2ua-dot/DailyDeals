// src/app/search.tsx - FIXED: Added safe area top padding
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { SearchBar } from '../components/common';
import { CachedImage } from '../components/common';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { addToBasket } from '../store/slices/basketSlice';
import { toggleFavoriteSubcategory, toggleFavoriteStore } from '../store/slices/favoritesSlice';
import { searchAll, SearchResult } from '../services/searchService';
import { useSafeTabBarHeight } from '../hooks';
import { cacheService, CACHE_KEYS, CACHE_DURATIONS } from '../services/cacheService';
import { logScreenView, logSearch, logSelectContent } from '../services/analyticsService';

type SearchTab = 'all' | 'catalogues' | 'offers' | 'subcategories' | 'stores';

export default function SearchScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { paddingBottom } = useSafeTabBarHeight();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = params.q || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{
    catalogues: SearchResult[];
    offers: SearchResult[];
    subcategories: SearchResult[];
    stores: SearchResult[];
    all: SearchResult[];
  }>({
    catalogues: [],
    offers: [],
    subcategories: [],
    stores: [],
    all: [],
  });

  const stores = useAppSelector(state => state.stores.stores);
  const catalogues = useAppSelector(state => state.offers.catalogues);
  const favoriteStoreIds = useAppSelector(state => state.favorites.storeIds);
  const favoriteSubcategoryIds = useAppSelector(state => state.favorites.subcategoryIds);

  const getCachedSearchKey = (query: string) =>
    `${CACHE_KEYS.SEARCH_RESULTS}_${query.toLowerCase().trim()}`;

  useFocusEffect(
    useCallback(() => {
      logScreenView('Search');
    }, [])
  );

  useEffect(() => {
    if (initialQuery.trim().length >= 3) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setResults({
        catalogues: [],
        offers: [],
        subcategories: [],
        stores: [],
        all: [],
      });
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string = searchQuery) => {
    const cacheKey = getCachedSearchKey(query);

    try {
      const cached = await cacheService.get<typeof results>(cacheKey);
      if (cached) {
        console.log('📦 Using cached search results for:', query);
        setResults(cached);
        return;
      }

      setSearching(true);
      console.log('🔍 Searching for:', query);
      
      logSearch(query);
      
      const searchResults = await searchAll(catalogues, stores, query);

      await cacheService.set(cacheKey, searchResults, CACHE_DURATIONS.SEARCH);
      console.log('✅ Search results cached for:', query);

      setResults(searchResults);
    } catch (error) {
      console.error('❌ Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const currentResults = useMemo(() => {
    return results[activeTab] || [];
  }, [results, activeTab]);

  const handleResultPress = (result: SearchResult) => {
    logSelectContent(result.type, result.id);
    
    switch (result.type) {
      case 'catalogue':
        router.push(`/flyer/${result.id}`);
        break;
      case 'offer':
        router.push(`/offer/${result.id}`);
        break;
      case 'subcategory':
        router.push({
          pathname: '/(tabs)/flyers',
          params: {
            initialViewMode: 'offers',
            initialSubcategory: result.id,
          },
        });
        break;
      case 'store':
        router.push(`/store/${result.id}`);
        break;
    }
  };

  const handleAddOfferToBasket = (result: SearchResult) => {
    if (result.type === 'offer') {
      const offer = result.data as any;
      dispatch(addToBasket({
        offer: {
          ...offer,
          storeId: offer.storeId,
          catalogueId: offer.catalogueId,
        },
        storeName: offer.storeName,
      }));
    }
  };

  const handleToggleFavorite = (result: SearchResult) => {
    if (result.type === 'catalogue') {
      const catalogue = result.data as any;
      dispatch(toggleFavoriteStore(catalogue.storeId));
    } else if (result.type === 'offer') {
      const offer = result.data as any;
      dispatch(toggleFavoriteSubcategory(offer.categoryId));
    } else if (result.type === 'subcategory') {
      dispatch(toggleFavoriteSubcategory(result.id));
    } else if (result.type === 'store') {
      dispatch(toggleFavoriteStore(result.id));
    }
  };

  const isFavorite = (result: SearchResult): boolean => {
    if (result.type === 'catalogue') {
      const catalogue = result.data as any;
      return favoriteStoreIds.includes(catalogue.storeId);
    } else if (result.type === 'offer') {
      const offer = result.data as any;
      return favoriteSubcategoryIds.includes(offer.categoryId);
    } else if (result.type === 'subcategory') {
      return favoriteSubcategoryIds.includes(result.id);
    } else if (result.type === 'store') {
      return favoriteStoreIds.includes(result.id);
    }
    return false;
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'catalogue': return 'book';
      case 'offer': return 'pricetag';
      case 'subcategory': return 'grid';
      case 'store': return 'storefront';
      default: return 'search';
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'catalogue': return 'كتالوج';
      case 'offer': return 'عرض';
      case 'subcategory': return 'فئة';
      case 'store': return 'متجر';
      default: return '';
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length >= 3) {
      performSearch(searchQuery);
    }
  };

  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { paddingTop: Math.max(insets.top, 40) + spacing.sm }]}>
      <View style={styles.searchBarWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="ابحث عن متجر، كتالوج، عرض، أو فئة..."
          autoFocus={!initialQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          large={true}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButtonInside}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.tabActive]}
        onPress={() => setActiveTab('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
          الكل ({results.all.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'stores' && styles.tabActive]}
        onPress={() => setActiveTab('stores')}
      >
        <Text style={[styles.tabText, activeTab === 'stores' && styles.tabTextActive]}>
          متاجر ({results.stores.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'catalogues' && styles.tabActive]}
        onPress={() => setActiveTab('catalogues')}
      >
        <Text style={[styles.tabText, activeTab === 'catalogues' && styles.tabTextActive]}>
          كتالوجات ({results.catalogues.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'offers' && styles.tabActive]}
        onPress={() => setActiveTab('offers')}
      >
        <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>
          عروض ({results.offers.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'subcategories' && styles.tabActive]}
        onPress={() => setActiveTab('subcategories')}
      >
        <Text style={[styles.tabText, activeTab === 'subcategories' && styles.tabTextActive]}>
          فئات ({results.subcategories.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderResultItem = ({ item }: { item: SearchResult }) => {
    const favorite = isFavorite(item);

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultContent}>
          {item.imageUrl ? (
            <CachedImage
              source={{ uri: item.imageUrl }}
              style={styles.resultImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
              <Ionicons
                name={getResultIcon(item.type) as any}
                size={24}
                color={colors.primary}
              />
            </View>
          )}

          <View style={styles.resultInfo}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.resultTypeBadge}>
                <Text style={styles.resultTypeText}>
                  {getResultTypeLabel(item.type)}
                </Text>
              </View>
            </View>

            {item.subtitle && (
              <Text style={styles.resultSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.favoriteIconButton}
              onPress={(e) => {
                e.stopPropagation();
                handleToggleFavorite(item);
              }}
            >
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={favorite ? colors.primary : colors.gray[400]}
              />
            </TouchableOpacity>

            {item.type === 'offer' ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddOfferToBasket(item);
                }}
              >
                <Ionicons name="add" size={20} color={colors.white} />
              </TouchableOpacity>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.gray[400]}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery.trim().length < 3) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color={colors.gray[300]} />
          <Text style={styles.emptyStateText}>ابحث عن متاجر، كتالوجات، عروض، أو فئات</Text>
          <Text style={styles.emptyStateSubtext}>
            اكتب على الأقل ٣ أحرف للبدء في البحث
          </Text>
        </View>
      );
    }

    if (searching) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري البحث...</Text>
        </View>
      );
    }

    if (currentResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={colors.gray[300]} />
          <Text style={styles.emptyStateText}>لا توجد نتائج</Text>
          <Text style={styles.emptyStateSubtext}>
            جرب كلمات بحث مختلفة
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        {renderSearchBar()}
        {searchQuery.trim().length >= 3 && renderTabs()}

        {currentResults.length > 0 ? (
          <FlatList
            data={currentResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={[styles.resultsList, { paddingBottom }]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          renderEmptyState()
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  searchBarWrapper: {
    position: 'relative',
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
  },
  clearButtonInside: {
    position: 'absolute',
    right: I18nManager.isRTL ? undefined : spacing.lg,
    left: I18nManager.isRTL ? spacing.lg : undefined,
    padding: spacing.xs,
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200]
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md
  },
  tabActive: {
    backgroundColor: colors.primary + '20'
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600'
  },
  resultsList: {
    padding: spacing.md
  },
  resultItem: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  resultContent: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100]
  },
  resultImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultInfo: {
    flex: 1,
    gap: spacing.xs
  },
  resultHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    gap: spacing.xs
  },
  resultTitle: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  resultTypeBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm
  },
  resultTypeText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: '600'
  },
  resultSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  actionButtons: {
    flexDirection: 'column',
    gap: spacing.xs,
    alignItems: 'center'
  },
  favoriteIconButton: {
    padding: spacing.xs
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center'
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center'
  },
});