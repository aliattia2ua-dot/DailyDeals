import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  I18nManager,
  Alert,
  ActivityIndicator,
  PanResponder,
  Modal,
  Animated,
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

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const DOUBLE_TAP_DELAY = 300;
const PLACEHOLDER_PAGE_IMAGE_URL = 'https://placehold.co/600x800/cccccc/ffffff?text=No+Image';

type CatalogueStatus = 'active' | 'upcoming' | 'expired';

interface CatalogueWithStatus extends Catalogue {
  status: CatalogueStatus;
}

export default function FlyerDetailScreen() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { getTitle, getName } = useLocalized();

  const [currentPage, setCurrentPage] = useState(0);
  const [catalogueOffers, setCatalogueOffers] = useState<OfferWithCatalogue[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Use refs to track state for PanResponder
  const currentPageRef = useRef(0);
  const isZoomedRef = useRef(false);
  const lastTap = useRef<number>(0);

  const catalogue = getCatalogueById(id);
  const stores = useAppSelector(state => state.stores.stores);
  const basketItems = useAppSelector(state => state.basket.items);
  const catalogues = useAppSelector(state => state.offers.catalogues);
  const userGovernorate = useAppSelector(state => state.settings.userGovernorate);

  const store = stores.find(s => s.id === catalogue?.storeId) || (catalogue ? {
    id: catalogue.storeId,
    nameAr: catalogue.titleAr.replace('عروض ', ''),
    nameEn: catalogue.titleEn.replace(' Offers', ''),
    logo: `https://placehold.co/100x100/e63946/ffffff?text=${catalogue.storeId}`,
    branches: [],
  } : null);

  const totalPages = catalogue?.pages?.length || 0;
  const totalPagesRef = useRef(totalPages);

  // Header title with catalogue name and date
  const headerTitle = useMemo(() => {
    if (!catalogue) return '';
    const dateRange = formatDateRange(catalogue.startDate, catalogue.endDate);
    return `${catalogue.titleAr} • ${dateRange}`;
  }, [catalogue]);

  // Analytics: Log screen view on mount
  useEffect(() => {
    if (id) {
      logScreenView('FlyerDetail', id);
      if (catalogue) {
        logViewItem(catalogue.id, catalogue.titleAr, catalogue.categoryId);
      }
    }
  }, [id, catalogue?.id]);

  // Set initial page from URL parameter
  useEffect(() => {
    if (page) {
      const pageNumber = parseInt(page, 10);
      if (!isNaN(pageNumber) && pageNumber > 0 && pageNumber <= totalPages) {
        const pageIndex = pageNumber - 1;
        setCurrentPage(pageIndex);
        console.log(`📄 [FlyerDetail] Navigated to page ${pageNumber} (index ${pageIndex})`);
      }
    }
  }, [page, totalPages]);

  // Update refs whenever state changes
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  // Zoom animation values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  // Load real offers from Firestore
  useEffect(() => {
    const loadOffers = async () => {
      if (!catalogue?.id) {
        setLoadingOffers(false);
        return;
      }

      try {
        setLoadingOffers(true);
        const offers = await getOffersByCatalogue(catalogue.id);
        setCatalogueOffers(offers);
      } catch (error) {
        console.error('Error loading catalogue offers:', error);
      } finally {
        setLoadingOffers(false);
      }
    };

    loadOffers();
  }, [catalogue?.id]);

  // Reset zoom when page changes or modal closes
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

  // Helper function to get catalogue status (using cached version)
  const getCatalogueStatus = useCallback((startDate: string, endDate: string): CatalogueStatus => {
    if (!catalogue) return 'expired';
    return cacheService.getCatalogueStatus(catalogue.id, startDate, endDate);
  }, [catalogue?.id]);

  // Find next catalogue logic
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
    if (sameStore) return sameStore;

    const sameCategory = activeCatalogues.find(c => c.categoryId === catalogue.categoryId);
    if (sameCategory) return sameCategory;

    return activeCatalogues[0] || null;
  }, [catalogue, catalogues, userGovernorate]);

  const nextCatalogueRef = useRef(nextCatalogue);
  useEffect(() => {
    nextCatalogueRef.current = nextCatalogue;
  }, [nextCatalogue]);

  // Close modal before navigating to next catalogue
  const navigateToNextCatalogue = useCallback(() => {
    if (nextCatalogueRef.current) {
      console.log('📄 Navigating to next catalogue:', nextCatalogueRef.current.id);

      // Close fullscreen modal first
      setFullScreenImage(false);

      // Small delay to ensure modal closes smoothly before navigation
      setTimeout(() => {
        router.push(`/flyer/${nextCatalogueRef.current!.id}`);
      }, 100);
    }
  }, [router]);

  // Double-tap to zoom handler
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
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

  // Clamp translation to prevent going too far
  const clampTranslation = useCallback((x: number, y: number, currentScale: number) => {
    const maxX = (width * (currentScale - 1)) / 2;
    const maxY = (height * 0.8 * (currentScale - 1)) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // NORMAL VIEW: Swipe with next catalogue support
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

        const isFastSwipe = Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD;
        const isLongSwipe = Math.abs(dx) > SWIPE_THRESHOLD;

        if (isFastSwipe || isLongSwipe) {
          // ✅ Fixed: Natural swipe direction (right = prev, left = next)
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

  // FULLSCREEN pan with proper navigation
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

          const isFastSwipe = Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD;
          const isLongSwipe = Math.abs(dx) > SWIPE_THRESHOLD;

          if (isFastSwipe || isLongSwipe) {
            // ✅ Fixed: Natural swipe direction (right = prev, left = next)
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

  const pageOffers = useMemo(() => {
    return catalogueOffers.filter(
      offer => offer.pageNumber === currentPage + 1
    );
  }, [catalogueOffers, currentPage]);

  const isPageSaved = useMemo(() => {
    if (!catalogue || !catalogue.pages || catalogue.pages.length === 0) return false;
    return basketItems.some(
      item =>
        item.type === 'page' &&
        item.cataloguePage?.catalogueId === catalogue.id &&
        item.cataloguePage?.pageNumber === currentPage + 1
    );
  }, [basketItems, catalogue?.id, currentPage]);

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

  const handleAddToBasket = useCallback((offer: OfferWithCatalogue) => {
    dispatch(addToBasket({
      offer,
      storeName: store.nameAr,
    }));
    logAddToCart(offer.id, offer.nameAr, offer.offerPrice, {
      catalogue_id: catalogue.id,
      page_number: currentPage + 1,
    });
  }, [dispatch, store?.nameAr, catalogue?.id, currentPage]);

  const handleOfferPress = useCallback((offer: OfferWithCatalogue) => {
    router.push(`/offer/${offer.id}`);
  }, [router]);

  const handleSavePage = useCallback(() => {
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
        storeName: store.nameAr,
        offers: pageOffers,
      })
    );

    Alert.alert('نجح', 'تم حفظ الصفحة في السلة');
  }, [currentPageData, isPageSaved, dispatch, catalogue, store?.nameAr, pageOffers]);

  const handleNavPress = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next') {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      } else if (nextCatalogue) {
        navigateToNextCatalogue();
      }
    }
  };

  const handleNextCatalogue = () => {
    if (nextCatalogue) {
      if (fullScreenImage) {
        setFullScreenImage(false);
        setTimeout(() => {
          router.push(`/flyer/${nextCatalogue.id}`);
        }, 100);
      } else {
        router.push(`/flyer/${nextCatalogue.id}`);
      }
    }
  };

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

  // Render next catalogue button (only on last page)
  const renderNextCatalogueButton = () => {
    if (!nextCatalogue || !isLastPage) return null;

    const nextStoreName = stores.find(s => s.id === nextCatalogue.storeId)?.nameAr ||
                          nextCatalogue.titleAr.replace('عروض ', '');

    return (
      <View style={styles.nextCatalogueSection}>
        <View style={styles.nextCatalogueHeader}>
          <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
          <Text style={styles.nextCatalogueTitle}>الكتالوج التالي</Text>
        </View>

        <TouchableOpacity
          style={styles.nextCatalogueCard}
          onPress={handleNextCatalogue}
          activeOpacity={0.8}
        >
          <CachedImage
            source={nextCatalogue.coverImage}
            style={styles.nextCatalogueImage}
            contentFit="cover"
          />

          <View style={styles.nextCatalogueInfo}>
            <View style={styles.nextCatalogueTextContainer}>
              <Text style={styles.nextCatalogueStoreName} numberOfLines={1}>
                {nextStoreName}
              </Text>
              <Text style={styles.nextCatalogueDate} numberOfLines={1}>
                {formatDateRange(nextCatalogue.startDate, nextCatalogue.endDate)}
              </Text>
              {nextCatalogue.isLocalStore && (
                <View style={styles.nextCatalogueLocalBadge}>
                  <Ionicons name="location" size={12} color={colors.success} />
                  <Text style={styles.nextCatalogueLocalText}>محلي</Text>
                </View>
              )}
            </View>

            <View style={styles.nextCatalogueAction}>
              <Text style={styles.nextCatalogueActionText}>عرض الآن</Text>
              <Ionicons
                name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color={colors.white}
              />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.nextCatalogueHint}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          {' '}اسحب لليسار للانتقال أو اضغط على البطاقة
        </Text>
      </View>
    );
  };

  // ✅ Fixed: Render swipe indicator on last page
  const renderLastPageSwipeIndicator = () => {
    if (!isLastPage || !nextCatalogue) return null;

    return (
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
    );
  };

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
                />
              </TouchableOpacity>

              {/* Last page indicator */}
              {renderLastPageSwipeIndicator()}
            </View>

            {/* ✅ Fixed: Consistent navigation direction */}
            <View style={styles.pageNavigationCenter}>
              <View style={styles.navControls}>
                {/* LEFT BUTTON - Always PREVIOUS */}
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

                {/* RIGHT BUTTON - Always NEXT */}
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

        {loadingOffers ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل العروض...</Text>
          </View>
        ) : pageOffers.length > 0 ? (
          <View style={styles.offersSection}>
            <View style={styles.thumbnailsGrid}>
              {pageOffers.map(renderOfferThumbnail)}
            </View>
          </View>
        ) : hasPages ? (
          <View style={styles.noOffersContainer}>
            <Ionicons name="pricetags-outline" size={48} color={colors.gray[400]} />
            <Text style={styles.noOffersText}>يمكنك اضافة الصفحه بكاملها الي السله - لا توجد عروض مسجله</Text>
          </View>
        ) : null}

        {/* Next Catalogue Button */}
        {renderNextCatalogueButton()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Fullscreen Modal with Double-Tap Zoom and Pan */}
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
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Zoom hint when not zoomed */}
          {!isZoomed && (
            <View style={styles.zoomHint}>
              <Ionicons name="hand-left-outline" size={20} color={colors.white} />
              <Text style={styles.zoomHintText}>اضغط مرتين للتكبير</Text>
            </View>
          )}

          {/* Pan hint when zoomed */}
          {isZoomed && (
            <View style={styles.zoomIndicator}>
              <Ionicons name="move" size={20} color={colors.white} />
              <Text style={styles.zoomText}>اسحب للتنقل • اضغط مرتين للتصغير</Text>
            </View>
          )}

          {/* ✅ Fixed: Last page indicator in fullscreen */}
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

          {/* ✅ Fixed: Fullscreen navigation with consistent direction */}
          <View style={styles.fullScreenNav}>
            {/* LEFT BUTTON - Always PREVIOUS */}
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

            {/* RIGHT BUTTON - Always NEXT */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems:  'center',
    padding: spacing. lg,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: typography.fontSize. lg,
    color:  colors.text,
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
  right: spacing.md,  // ✅ Always on right side (where user swipes from)
  flexDirection: 'row',  // ✅ Always left-to-right
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: borderRadius.full,
  gap: 4,
},
  swipeIndicatorText:  {
    fontSize:  typography.fontSize.xs,
    color:  colors.primary,
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
  navControls:  {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  navButton: {
    width: 50,
    height:  50,
    borderRadius: borderRadius.full,
    backgroundColor:  'rgba(230, 57, 70, 0.9)',
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
    paddingHorizontal:  spacing.md,
    paddingVertical: spacing. sm,
    borderRadius: borderRadius. full,
    shadowColor: '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation:  5,
  },
  pageIndicator: {
    color: colors.white,
    fontSize:  typography.fontSize.md,
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
    color:  colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  savePageSection:  {
    paddingHorizontal:  spacing.md,
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
    fontSize:  typography.fontSize.md,
    color:  colors.textSecondary,
  },
  offersSection: {
    padding: spacing.md,
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
    shadowOffset:  { width: 0, height: 1 },
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
    height:  '100%',
  },
  thumbnailDiscountBadge:  {
    position:  'absolute',
    top: spacing.xs,
    left: I18nManager.isRTL ? undefined : spacing.xs,
    right:  I18nManager. isRTL ?  spacing.xs : undefined,
    backgroundColor: colors.primary,
    paddingHorizontal:  spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius. xs,
  },
  thumbnailDiscountText: {
    color: colors.white,
    fontSize:  8,
    fontWeight: 'bold',
  },
  thumbnailContent: {
    padding: spacing.xs,
    minHeight: 70,
    display: 'flex',
    flexDirection: 'column',
  },
  thumbnailName:  {
    fontSize:  11,
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
    color:  colors.textSecondary,
    textDecorationLine: 'line-through',
    lineHeight: 10,
    marginTop: 1,
  },
  thumbnailAddButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius. sm,
    padding:  4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  noOffersContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius:  borderRadius.lg,
  },
  noOffersText:  {
    marginTop: spacing.md,
    fontSize:  typography.fontSize.md,
    color:  colors.textSecondary,
    textAlign: 'center',
  },
  nextCatalogueSection: {
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius:  borderRadius.lg,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextCatalogueHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  nextCatalogueTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  nextCatalogueCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation:  2,
  },
  nextCatalogueImage: {
    width: 100,
    height: 140,
    backgroundColor:  colors.gray[200],
  },
  nextCatalogueInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  nextCatalogueTextContainer: {
    flex: 1,
  },
  nextCatalogueStoreName: {
    fontSize: typography.fontSize. md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing. xs,
  },
  nextCatalogueDate:  {
    fontSize:  typography.fontSize.sm,
    color:  colors.textSecondary,
    marginBottom: spacing.xs,
  },
  nextCatalogueLocalBadge: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  nextCatalogueLocalText:  {
    fontSize:  typography.fontSize.xs,
    color:  colors.success,
    fontWeight: '600',
  },
  nextCatalogueAction: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    alignSelf: I18nManager.isRTL ? 'flex-end' :  'flex-start',
  },
  nextCatalogueActionText: {
    fontSize: typography.fontSize.sm,
    color:  colors.white,
    fontWeight: '600',
  },
  nextCatalogueHint: {
    fontSize: typography.fontSize. xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
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
    right:  I18nManager.isRTL ? undefined : 20,
    left: I18nManager.isRTL ? 20 :  undefined,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.full,
    padding:  spacing.sm,
  },
  fullScreenImageWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleTapArea:  {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems:  'center',
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
    backgroundColor:  'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing. md,
    paddingVertical: spacing. sm,
    borderRadius: borderRadius. full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  zoomHintText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight:  '500',
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
    alignItems:  'center',
    gap: spacing. xs,
  },
  zoomText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight:  '600',
  },
  fullScreenSwipeHint: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor:  colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.sm,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fullScreenSwipeHintText: {
    color: colors. white,
    fontSize: typography.fontSize. sm,
    fontWeight: '600',
  },
  fullScreenNav: {
    position: 'absolute',
    bottom: 40,
    left:  0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  fullScreenNavButton: {
    width: 60,
    height:  60,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(230, 57, 70, 0.9)',
    justifyContent:  'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation:  8,
  },
  fullScreenPageIndicator: {
    backgroundColor: 'rgba(100, 100, 100, 0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing. md,
    borderRadius: borderRadius.full,
  },
  fullScreenPageText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
  },
});