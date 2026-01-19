// Part 1: Updated imports and state management
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PanResponder,
  Modal,
  Animated,
  InteractionManager,
  Dimensions,
  I18nManager,
  StyleSheet,
} from 'react-native';

import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { Button, CachedImage } from '../../components/common';
import { SavePageButton } from '../../components/flyers';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useLocalized } from '../../hooks';
import { addToBasket, addPageToBasket } from '../../store/slices/basketSlice';
import { getCatalogueById } from '../../data/catalogueRegistry';
import { getOffersByCatalogue } from '../../services/offerService';
import { formatCurrency, calculateDiscount } from '../../utils/helpers';
import { formatDateRange } from '../../utils/catalogueUtils';
import { cacheService } from '../../services/cacheService';
import { logScreenView, logViewItem, logAddToCart } from '../../services/analyticsService';
import type { OfferWithCatalogue } from '../../services/offerService';
import type { Catalogue } from '../../types';

const PLACEHOLDER_PAGE_IMAGE_URL = 'https://placehold.co/600x800/cccccc/ffffff?text=No+Image';
const { width, height } = Dimensions.get('window');

type CatalogueStatus = 'active' | 'upcoming' | 'expired';

interface CatalogueWithStatus extends Catalogue {
  status: CatalogueStatus;
}

// 🔥 NEW: Offers cache state
interface OffersCacheState {
  hasOffers: boolean;
  checkedAt: number;
  totalOffers: number;
}

export default function FlyerDetailScreen() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { getTitle, getName } = useLocalized();

  // 🔥 PERFORMANCE: Track component lifecycle
  const mountTime = useRef(Date.now());
  const renderCount = useRef(0);
  const hasInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // 🔥 NEW: Image loading tracking
  const [imageLoadMetrics, setImageLoadMetrics] = useState({
    totalTime: 0,
    mountTime: 0,
    firstRenderTime: 0,
    dataLoadTime: 0,
    imageLoadStartTime: 0,
    imageLoadEndTime: 0,
    imageRenderTime: 0,
  });
  
  // 🔥 NEW: Toggle for performance overlay
  const [showPerfOverlay, setShowPerfOverlay] = useState(false);
  
  const imageLoadStartRef = useRef(0);
  const transitionStartRef = useRef(0);
  const imageHasRenderedRef = useRef(false);

  // State
  const [currentPage, setCurrentPage] = useState(0);
  const [catalogueOffers, setCatalogueOffers] = useState<OfferWithCatalogue[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  
  // 🔥 NEW: Offers availability cache
  const [offersCache, setOffersCache] = useState<OffersCacheState | null>(null);
  const offersCacheChecked = useRef(false);
  
  const [fullScreenImage, setFullScreenImage] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Refs for PanResponder
  const currentPageRef = useRef(0);
  const isZoomedRef = useRef(false);
  const lastTap = useRef<number>(0);

  // Redux
  const catalogue = getCatalogueById(id);
  const stores = useAppSelector(state => state.stores.stores);
  const basketItems = useAppSelector(state => state.basket.items);
  const catalogues = useAppSelector(state => state.offers.catalogues);
  const userGovernorate = useAppSelector(state => state.settings.userGovernorate);

  const totalPages = catalogue?.pages?.length || 0;
  const totalPagesRef = useRef(totalPages);

// 🔥 NEW: Performance tracking overlay component with toggle
const PerformanceOverlay = ({
  visible,
  metrics,
  onToggle,
}: {
  visible: boolean;
  metrics: {
    totalTime: number;
    mountTime: number;
    firstRenderTime: number;
    dataLoadTime: number;
    imageLoadStartTime: number;
    imageLoadEndTime: number;
    imageRenderTime: number;
  };
  onToggle: () => void;
}) => {
  const getColor = (time: number) => {
    if (time < 100) return '#4caf50';
    if (time < 500) return '#ff9800';
    return '#f44336';
  };

  const getTotalColor = () => getColor(metrics.totalTime);
  const getImageLoadTime = () => metrics.imageLoadEndTime - metrics.imageLoadStartTime;

  return (
    <>
      {/* Toggle Button - Always Visible */}
      <TouchableOpacity
        style={styles.perfToggleButton}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={visible ? "speedometer" : "speedometer-outline"}
          size={20}
          color={colors.white}
        />
      </TouchableOpacity>

      {/* Overlay - Only when visible */}
      {visible && (
        <View style={styles.perfOverlay}>
          <View style={styles.perfHeader}>
            <Text style={styles.perfTitle}>🎯 Transition Metrics</Text>
            <Text style={[styles.perfTotal, { color: getTotalColor() }]}>
              {metrics.totalTime}ms
            </Text>
          </View>

          <View style={styles.perfMetrics}>
            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>Mount:</Text>
              <Text style={styles.perfValue}>{metrics.mountTime}ms</Text>
            </View>

            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>First Render:</Text>
              <Text style={styles.perfValue}>{metrics.firstRenderTime}ms</Text>
            </View>

            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>Data Load:</Text>
              <Text style={[styles.perfValue, { color: getColor(metrics.dataLoadTime) }]}>
                {metrics.dataLoadTime}ms
              </Text>
            </View>

            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>🖼️ Image Start:</Text>
              <Text style={styles.perfValue}>{metrics.imageLoadStartTime}ms</Text>
            </View>

            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>🖼️ Image Loaded:</Text>
              <Text style={[styles.perfValue, { color: getColor(getImageLoadTime()) }]}>
                {getImageLoadTime()}ms
              </Text>
            </View>

            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>🖼️ Image Rendered:</Text>
              <Text style={styles.perfValue}>{metrics.imageRenderTime}ms</Text>
            </View>
          </View>

          {getImageLoadTime() > 500 && (
            <View style={styles.perfWarning}>
              <Ionicons name="warning" size={16} color="#ff9800" />
              <Text style={styles.perfWarningText}>
                Image loading is slow! ({getImageLoadTime()}ms)
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  );
};


// Part 3: Optimized offers loading with initial check

  // 🔥 PERFORMANCE: Track renders
  useEffect(() => {
    renderCount.current++;
    console.log(`📄 [FlyerDetail] Render #${renderCount.current}`);
  });

  // 🔥 PERFORMANCE: Track mount and defer heavy work
  useEffect(() => {
    const transitionStart = Date.now();
    transitionStartRef.current = transitionStart;

    const mountDuration = Date.now() - mountTime.current;
    console.log(`⏱️ [FlyerDetail] Mounted in ${mountDuration}ms`);

    setImageLoadMetrics(prev => ({
      ...prev,
      mountTime: mountDuration,
    }));

    // Defer heavy initialization
    InteractionManager.runAfterInteractions(() => {
      console.log('✅ [FlyerDetail] Interactions complete');
      const firstRenderTime = Date.now() - transitionStart;

      setImageLoadMetrics(prev => ({
        ...prev,
        firstRenderTime,
      }));

      setIsReady(true);
    });

    return () => {
      const totalTime = Date.now() - transitionStart;

      setImageLoadMetrics(prev => ({
        ...prev,
        totalTime,
      }));

      console.log('👋 [FlyerDetail] Unmounted');
    };
  }, []);

  // 🔥 NEW: OPTIMIZED - Check if catalogue has ANY offers at start
  // This runs ONCE when component mounts and caches the result
  useEffect(() => {
    const checkCatalogueHasOffers = async () => {
      if (!catalogue?.id || offersCacheChecked.current) {
        return;
      }

      offersCacheChecked.current = true;

      try {
        console.log(`🔍 [Offers Check] Checking if catalogue ${catalogue.id} has offers...`);

        const offers = await getOffersByCatalogue(catalogue.id);

        const hasOffers = offers.length > 0;
        const cacheState: OffersCacheState = {
          hasOffers,
          checkedAt: Date.now(),
          totalOffers: offers.length,
        };

        setOffersCache(cacheState);

        // If we have offers, set them immediately
        if (hasOffers) {
          setCatalogueOffers(offers);
          console.log(`✅ [Offers Check] Found ${offers.length} offers for catalogue`);
        } else {
          console.log(`ℹ️ [Offers Check] No offers found for catalogue`);
        }

        const duration = Date.now() - (transitionStartRef.current || Date.now());
        setImageLoadMetrics(prev => ({
          ...prev,
          dataLoadTime: duration || 0,
        }));
      } catch (error) {
        console.error('❌ [Offers Check] Error checking offers:', error);
        setOffersCache({
          hasOffers: false,
          checkedAt: Date.now(),
          totalOffers: 0,
        });
      } finally {
        setLoadingOffers(false);
      }
    };

    checkCatalogueHasOffers();
  }, [catalogue?.id]);

  // 🔥 OPTIMIZED: Memoize store lookup
  const store = useMemo(() => {
    return stores.find(s => s.id === catalogue?.storeId) || (catalogue ? {
      id: catalogue.storeId,
      nameAr: catalogue.titleAr.replace('عروض ', ''),
      nameEn: catalogue.titleEn.replace(' Offers', ''),
      logo: `https://placehold.co/100x100/e63946/ffffff?text=${catalogue.storeId}`,
      branches: [],
    } : null);
  }, [stores, catalogue?.storeId, catalogue?.titleAr, catalogue?.titleEn]);

  // 🔥 OPTIMIZED: Memoize header title
  const headerTitle = useMemo(() => {
    if (!catalogue) return '';
    const dateRange = formatDateRange(catalogue.startDate, catalogue.endDate);
    return `${catalogue.titleAr} • ${dateRange}`;
  }, [catalogue?.titleAr, catalogue?.startDate, catalogue?.endDate]);

  // Analytics: Log screen view
  useEffect(() => {
    if (id && !hasInitialized.current) {
      hasInitialized.current = true;
      logScreenView('FlyerDetail', id);
      if (catalogue) {
        logViewItem(catalogue.id, catalogue.titleAr, catalogue.categoryId);
      }
    }
  }, [id, catalogue?.id]);

  // Set initial page
  useEffect(() => {
    if (page && totalPages > 0) {
      const pageNumber = parseInt(page, 10);
      if (!isNaN(pageNumber) && pageNumber > 0 && pageNumber <= totalPages) {
        const pageIndex = pageNumber - 1;
        setCurrentPage(pageIndex);
        console.log(`📄 [FlyerDetail] Navigated to page ${pageNumber} (index ${pageIndex})`);
      }
    }
  }, [page, totalPages]);

  // Update refs
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

// Part 4: Optimized page offers and callbacks

  // Zoom animation values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  // 🔥 NEW: Track image loading for current page
  useEffect(() => {
    if (!catalogue?.pages || !catalogue.pages[currentPage]) {
      return;
    }

    const currentPageData = catalogue.pages[currentPage];
    setImageLoaded(false);
    imageHasRenderedRef.current = false;

    // Mark image load start
    const imageStartTime = Date.now() - transitionStartRef.current;
    imageLoadStartRef.current = Date.now();

    setImageLoadMetrics(prev => ({
      ...prev,
      imageLoadStartTime: imageStartTime,
    }));

    console.log(`🖼️ [Image] Load started for page ${currentPage + 1} at ${imageStartTime}ms`);

    // Preload the image
    if (currentPageData.imageUrl) {
      Image.prefetch(currentPageData.imageUrl)
        .then(() => {
          const imageEndTime = Date.now();
          const loadDuration = imageEndTime - imageLoadStartRef.current;
          const totalElapsed = imageEndTime - transitionStartRef.current;

          setImageLoadMetrics(prev => ({
            ...prev,
            imageLoadEndTime: totalElapsed,
          }));

          if (loadDuration > 500) {
            console.error(`🔴 [Image] SLOW LOAD: ${loadDuration}ms for page ${currentPage + 1}`);
          } else if (loadDuration > 200) {
            console.warn(`⚠️ [Image] Acceptable load: ${loadDuration}ms for page ${currentPage + 1}`);
          } else {
            console.log(`✅ [Image] Fast load: ${loadDuration}ms for page ${currentPage + 1}`);
          }
        })
        .catch((error) => {
          console.error(`❌ [Image] Prefetch failed:`, error);
        });
    }
  }, [currentPage, catalogue?.id]);

  // 🔥 NEW: Track when image actually renders
  const handleImageLoad = useCallback(() => {
    // Prevent multiple calls
    if (imageHasRenderedRef.current) {
      console.log('⚠️ [Image] onLoad called multiple times, ignoring...');
      return;
    }

    imageHasRenderedRef.current = true;
    const renderTime = Date.now() - transitionStartRef.current;

    setImageLoadMetrics(prev => ({
      ...prev,
      imageRenderTime: renderTime,
    }));

    setImageLoaded(true);

    const loadDuration = Date.now() - imageLoadStartRef.current;
    console.log(`🖼️ [Image] Rendered in ${loadDuration}ms (total: ${renderTime}ms)`);

    // Mark transition as complete
    const totalTransitionTime = Date.now() - transitionStartRef.current;
    setImageLoadMetrics(prev => ({
      ...prev,
      totalTime: totalTransitionTime,
    }));
  }, []);

  // Reset zoom when page changes
  useEffect(() => {
    resetZoom();
  }, [currentPage, fullScreenImage]);

  const resetZoom = useCallback(() => {
    setIsZoomed(false);
    isZoomedRef.current = false;
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  }, [scale, translateX, translateY]);

  // 🔥 OPTIMIZED: Use cached catalogue status
  const getCatalogueStatus = useCallback((startDate: string, endDate: string): CatalogueStatus => {
    if (!catalogue) return 'expired';
    return cacheService.getCatalogueStatus(catalogue.id, startDate, endDate);
  }, [catalogue?.id]);

  // 🔥 OPTIMIZED: Memoize next catalogue with proper dependencies
  const nextCatalogue = useMemo(() => {
    if (!catalogue) return null;

    const cataloguesWithStatus: CatalogueWithStatus[] = catalogues.map(cat => ({
      ...cat,
      status: getCatalogueStatus(cat.startDate, cat.endDate),
    }));

    let activeCatalogues = cataloguesWithStatus.filter(
      c => c.status === 'active' && c.id !== catalogue.id
    );

    if (userGovernorate) {
      activeCatalogues = activeCatalogues.filter(cat => {
        if (!cat.isLocalStore) return true;
        return cat.localStoreGovernorate === userGovernorate;
      });
    }

    const sameStore = activeCatalogues.find(c => c.storeId === catalogue.storeId);
    if (sameStore) {
      return sameStore;
    }

    const sameCategory = activeCatalogues.find(c => c.categoryId === catalogue.categoryId);
    if (sameCategory) {
      return sameCategory;
    }

    const result = activeCatalogues[0] || null;
    return result;
  }, [catalogue?.id, catalogue?.storeId, catalogue?.categoryId, catalogues, userGovernorate, getCatalogueStatus]);

  const nextCatalogueRef = useRef(nextCatalogue);
  useEffect(() => {
    nextCatalogueRef.current = nextCatalogue;
  }, [nextCatalogue]);

  // Navigate to next catalogue
  const navigateToNextCatalogue = useCallback(() => {
    if (nextCatalogueRef.current) {
      console.log('📄 Navigating to next catalogue:', nextCatalogueRef.current.id);

      setFullScreenImage(false);

      setTimeout(() => {
        router.push(`/flyer/${nextCatalogueRef.current!.id}`);
      }, 100);
    }
  }, [router]);

  // 🔥 NEW: Toggle performance overlay
  const handleTogglePerfOverlay = useCallback(() => {
    setShowPerfOverlay(prev => !prev);
  }, []);

// Part 5: Event handlers and PanResponders

  // Double-tap zoom handler
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();

    if (now - lastTap.current < 300) {
      if (isZoomedRef.current) {
        setIsZoomed(false);
        isZoomedRef.current = false;
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
          }),
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }),
        ]).start();
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
      } else {
        setIsZoomed(true);
        isZoomedRef.current = true;
        Animated.spring(scale, {
          toValue: 2.5,
          useNativeDriver: true,
          friction: 5,
        }).start();
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [scale, translateX, translateY]);

  // Clamp translation
  const clampTranslation = useCallback((x: number, y: number, currentScale: number) => {
    const maxX = (width * (currentScale - 1)) / 2;
    const maxY = (height * 0.8 * (currentScale - 1)) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // 🔥 OPTIMIZED: Memoize PanResponders
  const normalViewPan = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const page = currentPageRef.current;
        const maxPages = totalPagesRef.current;

        const isFastSwipe = Math.abs(vx) > 0.3;
        const isLongSwipe = Math.abs(dx) > 50;

        if (isFastSwipe || isLongSwipe) {
          const isSwipeLeft = dx < 0;
          const isSwipeRight = dx > 0;

          if (isSwipeRight && page > 0) {
            setCurrentPage(page - 1);
          } else if (isSwipeLeft && page < maxPages - 1) {
            setCurrentPage(page + 1);
          } else if (isSwipeLeft && page === maxPages - 1 && nextCatalogueRef.current) {
            navigateToNextCatalogue();
          }
        }
      },
    }), [navigateToNextCatalogue]);

  const fullScreenPan = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isZoomedRef.current) {
          return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        }
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        if (isZoomedRef.current) {
          translateX.stopAnimation((value) => {
            lastTranslateX.current = value;
          });
          translateY.stopAnimation((value) => {
            lastTranslateY.current = value;
          });
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (isZoomedRef.current) {
          const newX = lastTranslateX.current + gestureState.dx;
          const newY = lastTranslateY.current + gestureState.dy;
          const currentScale = 2.5;
          const clamped = clampTranslation(newX, newY, currentScale);

          translateX.setValue(clamped.x);
          translateY.setValue(clamped.y);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isZoomedRef.current) {
          translateX.stopAnimation((value) => {
            lastTranslateX.current = value;
          });
          translateY.stopAnimation((value) => {
            lastTranslateY.current = value;
          });
        } else {
          const { dx, vx } = gestureState;
          const page = currentPageRef.current;
          const maxPages = totalPagesRef.current;

          const isFastSwipe = Math.abs(vx) > 0.3;
          const isLongSwipe = Math.abs(dx) > 50;

          if (isFastSwipe || isLongSwipe) {
            const isSwipeLeft = dx < 0;
            const isSwipeRight = dx > 0;

            if (isSwipeRight && page > 0) {
              setCurrentPage(page - 1);
            } else if (isSwipeLeft && page < maxPages - 1) {
              setCurrentPage(page + 1);
            } else if (isSwipeLeft && page === maxPages - 1 && nextCatalogueRef.current) {
              navigateToNextCatalogue();
            }
          }
        }
      },
    }), [translateX, translateY, clampTranslation, navigateToNextCatalogue]);

  // 🔥 OPTIMIZED: Memoize page offers - only compute if cache says we have offers
  const pageOffers = useMemo(() => {
    // Skip filtering if we know there are no offers
    if (offersCache && !offersCache.hasOffers) {
      return [];
    }

    // Only filter if we have offers
    if (catalogueOffers.length === 0) {
      return [];
    }

    const filtered = catalogueOffers.filter(
      offer => offer.pageNumber === currentPage + 1
    );
    return filtered;
  }, [catalogueOffers, currentPage, offersCache]);

  // 🔥 OPTIMIZED: Memoize isPageSaved check
  const isPageSaved = useMemo(() => {
    if (!catalogue || !catalogue.pages || catalogue.pages.length === 0) return false;
    return basketItems.some(
      item =>
        item.type === 'page' &&
        item.cataloguePage?.catalogueId === catalogue.id &&
        item.cataloguePage?.pageNumber === currentPage + 1
    );
  }, [basketItems, catalogue?.id, catalogue?.pages, currentPage]);

  // 🔥 OPTIMIZED: Memoize callbacks
  const handleAddToBasket = useCallback((offer: OfferWithCatalogue) => {
    dispatch(addToBasket({
      offer,
      storeName: store?.nameAr || '',
    }));
    logAddToCart(offer.id, offer.nameAr, offer.offerPrice, {
      catalogue_id: catalogue?.id || '',
      page_number: currentPage + 1,
    });
  }, [dispatch, store?.nameAr, catalogue?.id, currentPage]);

  const handleOfferPress = useCallback((offer: OfferWithCatalogue) => {
    router.push(`/offer/${offer.id}`);
  }, [router]);

  const handleSavePage = useCallback(() => {
    if (!catalogue?.pages) {
      Alert.alert('خطأ', 'لا توجد صفحة للحفظ');
      return;
    }

    const currentPageData = catalogue.pages[currentPage];
    if (!currentPageData) {
      Alert.alert('خطأ', 'لا توجد صفحة للحفظ');
      return;
    }

    if (isPageSaved) {
      Alert.alert('تنبيه', 'تم حفظ هذه الصفحة مسبقاً');
      return;
    }

    dispatch(
      addPageToBasket({
        catalogue,
        page: currentPageData,
        storeName: store?.nameAr || '',
        offers: pageOffers,
      })
    );

    Alert.alert('نجح', 'تم حفظ الصفحة في السلة');
  }, [catalogue, currentPage, isPageSaved, dispatch, store?.nameAr, pageOffers]);

  const handleNavPress = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next') {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      } else if (nextCatalogue) {
        navigateToNextCatalogue();
      }
    }
  }, [currentPage, totalPages, nextCatalogue, navigateToNextCatalogue]);

// Part 6: Render functions and early returns

  // 🔥 OPTIMIZED: Memoize offer thumbnail render
  const renderOfferThumbnail = useCallback((offer: OfferWithCatalogue) => {
    const discount = offer.originalPrice
      ? calculateDiscount(offer.originalPrice, offer.offerPrice)
      : 0;

    return (
      <TouchableOpacity
        key={offer.id}
        style={styles.offerThumbnail}
        onPress={() => handleOfferPress(offer)}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailImageContainer}>
          <CachedImage
            source={offer.imageUrl}
            style={styles.thumbnailImage}
            contentFit="cover"
            showLoader={false}
          />
          {discount > 0 && (
            <View style={styles.thumbnailDiscountBadge}>
              <Text style={styles.thumbnailDiscountText}>{discount}%</Text>
            </View>
          )}
        </View>

        <View style={styles.thumbnailContent}>
          <Text style={styles.thumbnailName} numberOfLines={2}>
            {offer.nameAr}
          </Text>

          <View style={styles.thumbnailPriceRow}>
            <Text style={styles.thumbnailOfferPrice}>
              {formatCurrency(offer.offerPrice)}
            </Text>
            {offer.originalPrice && (
              <Text style={styles.thumbnailOriginalPrice}>
                {formatCurrency(offer.originalPrice)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.thumbnailAddButton}
            onPress={() => handleAddToBasket(offer)}
          >
            <Ionicons name="add" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [handleOfferPress, handleAddToBasket]);

  // Early returns for error states
  if (!catalogue) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="document-text-outline" size={64} color={colors.gray[300]} />
        <Text style={styles.errorText}>الكتالوج غير موجود</Text>
        <Text style={styles.errorSubtext}>ID: {id}</Text>
        <Button title="العودة" onPress={() => router.back()} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>المتجر غير موجود</Text>
        <Button title="العودة" onPress={() => router.back()} />
      </View>
    );
  }

  const hasPages = catalogue.pages && catalogue.pages.length > 0;
  const currentPageData = hasPages ? catalogue.pages[currentPage] : null;
  const isLastPage = currentPage === totalPages - 1;

  // 🔥 PERFORMANCE: Show loading skeleton while interactions complete
  if (!isReady) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: headerTitle,
            headerBackTitle: 'عودة',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </>
    );
  }

  // 🔥 NEW: Show offers status in UI
  const shouldShowOffersSection = offersCache?.hasOffers && pageOffers.length > 0;
  const shouldShowNoOffersMessage = offersCache?.hasOffers === false;

// Part 7: Main JSX return - First half

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: headerTitle,
          headerBackTitle: 'عودة',
          headerTitleStyle: {
            fontSize: 14,
          },
        }}
      />

      {/* 🔥 NEW: Performance Overlay with Toggle */}
      <PerformanceOverlay
        visible={showPerfOverlay}
        metrics={imageLoadMetrics}
        onToggle={handleTogglePerfOverlay}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {hasPages ? (
          <View style={styles.pageContainer}>
            <View {...normalViewPan.panHandlers} style={styles.swipeContainer}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setFullScreenImage(true)}
              >
                <CachedImage
                  source={currentPageData?.imageUrl || PLACEHOLDER_PAGE_IMAGE_URL}
                  style={styles.pageImage}
                  contentFit="contain"
                  showLoader={true}
                  cachePriority="high"
                  onLoadStart={() => {
                    console.log('🖼️ [CachedImage] onLoadStart called');
                  }}
                  onLoad={handleImageLoad}
                  onError={(error) => {
                    console.error('❌ [Image] Load error:', error);
                  }}
                />

                {/* 🔥 NEW: Loading indicator while image loads */}
                {!imageLoaded && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.imageLoadingText}>
                      Loading page {currentPage + 1}...
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {isLastPage && nextCatalogue && (
                <View style={styles.swipeIndicator}>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.swipeIndicatorText}>
                    اسحب للكتالوج التالي
                  </Text>
                </View>
              )}
            </View>

            {/* Navigation controls */}
            <View style={styles.pageNavigationCenter}>
              <View style={styles.navControls}>
                <TouchableOpacity
                  style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
                  onPress={() => handleNavPress('prev')}
                  disabled={currentPage === 0}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={currentPage === 0 ? colors.gray[400] : colors.white}
                  />
                </TouchableOpacity>

                <View style={styles.pageIndicatorBadge}>
                  <Text style={styles.pageIndicator}>
                    {currentPage + 1} / {catalogue.pages.length}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    isLastPage && !nextCatalogue && styles.navButtonDisabled,
                    isLastPage && nextCatalogue && styles.navButtonNextCatalogue,
                  ]}
                  onPress={() => handleNavPress('next')}
                  disabled={isLastPage && !nextCatalogue}
                >
                  <Ionicons
                    name={isLastPage && nextCatalogue ? "arrow-forward" : "chevron-forward"}
                    size={24}
                    color={isLastPage && !nextCatalogue ? colors.gray[400] : colors.white}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noPagesContainer}>
            <Ionicons name="document-text" size={64} color={colors.primary} />
            <Text style={styles.noPagesText}>
              لا توجد صور لهذا الكتالوج
            </Text>
          </View>
        )}

        {hasPages && (
          <View style={styles.savePageSection}>
            <SavePageButton
              isSaved={isPageSaved}
              onPress={handleSavePage}
            />
          </View>
        )}

        {/* 🔥 OPTIMIZED: Offers section - only render if we have offers */}
        {loadingOffers ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل العروض...</Text>
          </View>
        ) : shouldShowOffersSection ? (
          <View style={styles.offersSection}>
            <View style={styles.offersSectionHeader}>
              <Text style={styles.offersSectionTitle}>
                العروض في هذه الصفحة ({pageOffers.length})
              </Text>
            </View>
            <View style={styles.thumbnailsGrid}>
              {pageOffers.map(renderOfferThumbnail)}
            </View>
          </View>
        ) : shouldShowNoOffersMessage && hasPages ? (
          <View style={styles.noOffersContainer}>
            <Ionicons name="pricetags-outline" size={48} color={colors.gray[400]} />
            <Text style={styles.noOffersText}>
              يمكنك اضافة الصفحه بكاملها الي السله - لا توجد عروض مسجله لهذا الكتالوج
            </Text>
          </View>
        ) : null}

        <View style={styles.bottomPadding} />
      </ScrollView>

// Part 8: Fullscreen Modal and beginning of styles

      {/* Fullscreen Modal */}
      <Modal
        visible={fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(false)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullScreenImage(false)}
          >
            <Ionicons name="close" size={32} color={colors.white} />
          </TouchableOpacity>

          <View
            style={styles.fullScreenImageWrapper}
            {...fullScreenPan.panHandlers}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleDoubleTap}
              style={styles.doubleTapArea}
            >
              <Animated.View
                style={[
                  styles.animatedImageContainer,
                  {
                    transform: [
                      { scale: scale },
                      { translateX: translateX },
                      { translateY: translateY },
                    ],
                  },
                ]}
              >
                <CachedImage
                  source={currentPageData?.imageUrl || PLACEHOLDER_PAGE_IMAGE_URL}
                  style={styles.fullScreenImage}
                  contentFit="contain"
                  cachePriority="high"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {!isZoomed && (
            <View style={styles.zoomHint}>
              <Ionicons name="hand-left-outline" size={20} color={colors.white} />
              <Text style={styles.zoomHintText}>اضغط مرتين للتكبير</Text>
            </View>
          )}

          {isZoomed && (
            <View style={styles.zoomIndicator}>
              <Ionicons name="move" size={20} color={colors.white} />
              <Text style={styles.zoomText}>اسحب للتنقل • اضغط مرتين للتصغير</Text>
            </View>
          )}

          {isLastPage && nextCatalogue && !isZoomed && (
            <View style={styles.fullScreenSwipeHint}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.white}
              />
              <Text style={styles.fullScreenSwipeHintText}>
                اسحب للكتالوج التالي
              </Text>
            </View>
          )}

          <View style={styles.fullScreenNav}>
            <TouchableOpacity
              style={[styles.fullScreenNavButton, currentPage === 0 && styles.navButtonDisabled]}
              onPress={() => handleNavPress('prev')}
              disabled={currentPage === 0 || isZoomed}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={colors.white}
              />
            </TouchableOpacity>

            <View style={styles.fullScreenPageIndicator}>
              <Text style={styles.fullScreenPageText}>
                {currentPage + 1} / {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.fullScreenNavButton,
                isLastPage && !nextCatalogue && styles.navButtonDisabled,
                isLastPage && nextCatalogue && styles.navButtonNextCatalogue,
              ]}
              onPress={() => handleNavPress('next')}
              disabled={(isLastPage && !nextCatalogue) || isZoomed}
            >
              <Ionicons
                name={isLastPage && nextCatalogue ? "arrow-forward" : "chevron-forward"}
                size={28}
                color={isLastPage && !nextCatalogue ? colors.gray[400] : colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Part 9: Complete StyleSheet

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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageLoadingText: {
    color: colors.white,
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  pageContainer: {
    backgroundColor: colors.gray[900],
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  swipeContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  pageImage: {
    width: '100%',
    height: 480,
    backgroundColor: colors.gray[200],
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: 60,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  swipeIndicatorText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  pageNavigationCenter: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(230, 57, 70, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  navButtonNextCatalogue: {
    backgroundColor: colors.success,
  },
  pageIndicatorBadge: {
    backgroundColor: 'rgba(100, 100, 100, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pageIndicator: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  noPagesContainer: {
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  noPagesText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  savePageSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loadingSection: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  offersSection: {
    padding: spacing.md,
  },
  offersSectionHeader: {
    marginBottom: spacing.md,
  },
  offersSectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  thumbnailsGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  offerThumbnail: {
    width: '23.5%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnailImageContainer: {
    position: 'relative',
    height: 80,
    backgroundColor: colors.gray[100],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailDiscountBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: I18nManager.isRTL ? undefined : spacing.xs,
    right: I18nManager.isRTL ? spacing.xs : undefined,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  thumbnailDiscountText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  thumbnailContent: {
    padding: spacing.xs,
    minHeight: 70,
    display: 'flex',
    flexDirection: 'column',
  },
  thumbnailName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    minHeight: 28,
    lineHeight: 14,
  },
  thumbnailPriceRow: {
    flexDirection: 'column',
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
    marginBottom: 3,
    gap: 0,
  },
  thumbnailOfferPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    lineHeight: 13,
  },
  thumbnailOriginalPrice: {
    fontSize: 8,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    lineHeight: 10,
    marginTop: 1,
  },
  thumbnailAddButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  noOffersContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
  },
  noOffersText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: spacing.xl,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: I18nManager.isRTL ? undefined : 20,
    left: I18nManager.isRTL ? 20 : undefined,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.full,
    padding: spacing.sm,
  },
  fullScreenImageWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleTapArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height * 0.8,
  },
  zoomHint: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  zoomHintText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  zoomIndicator: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  zoomText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  fullScreenSwipeHint: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fullScreenSwipeHintText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  fullScreenNav: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  fullScreenNavButton: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(230, 57, 70, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  fullScreenPageIndicator: {
    backgroundColor: 'rgba(100, 100, 100, 0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  fullScreenPageText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
  },
  // 🔥 NEW: Performance overlay styles with toggle
  perfToggleMinimized: {
    position: 'absolute',
    top: 100,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  perfOverlay: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    zIndex: 1000,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  perfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    paddingBottom: spacing.xs,
  },
  perfHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  perfTitle: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  perfTotal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  perfCloseButton: {
    padding: 2,
  },
  perfMetrics: {
    gap: 4,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfLabel: {
    color: colors.gray[400],
    fontSize: 10,
  },
  perfValue: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  perfWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  perfWarningText: {
    color: '#ff9800',
    fontSize: 9,
    fontWeight: '600',
    flex: 1,
  },
});