// src/services/analyticsService.ts - Cross-platform Firebase Analytics
import { Platform } from 'react-native';
import { Analytics } from 'firebase/analytics';

let webAnalytics: Analytics | null = null;
let nativeAnalytics:  any = null;
let isInitialized = false;

/**
 * Initialize analytics based on platform
 */
export const initializeAnalytics = async (analytics: Analytics | null): Promise<void> => {
  if (isInitialized) return;

  if (Platform.OS === 'web') {
    webAnalytics = analytics;
    if (webAnalytics) {
      console.log('✅ [Analytics] Web analytics ready');
      isInitialized = true;
    }
  } else {
    // Native platforms - try to load @react-native-firebase/analytics
    try {
      const rnfAnalytics = require('@react-native-firebase/analytics');
      nativeAnalytics = rnfAnalytics. default();
      console.log('✅ [Analytics] Native analytics ready');
      isInitialized = true;
    } catch (error) {
      console.log('📱 [Analytics] Native analytics not available - install @react-native-firebase/analytics and rebuild');
    }
  }
};

/**
 * Log screen view
 */
export const logScreenView = async (screenName: string, screenClass?:  string): Promise<void> => {
  try {
    if (Platform.OS === 'web' && webAnalytics) {
      const { logEvent } = await import('firebase/analytics');
      logEvent(webAnalytics, 'screen_view', {
        screen_name: screenName,
        screen_class:  screenClass || screenName,
      });
      console.log(`📊 [Analytics] Screen view:  ${screenName}`);
    } else if (nativeAnalytics) {
      await nativeAnalytics.logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log(`📊 [Analytics] Screen view: ${screenName}`);
    }
  } catch (error) {
    console.warn('⚠️ [Analytics] Failed to log screen view:', error);
  }
};

/**
 * Log custom event
 */
export const logEvent = async (
  eventName: string,
  params?:  Record<string, any>
): Promise<void> => {
  try {
    if (Platform.OS === 'web' && webAnalytics) {
      const { logEvent:  firebaseLogEvent } = await import('firebase/analytics');
      firebaseLogEvent(webAnalytics, eventName, params);
      console.log(`📊 [Analytics] Event: ${eventName}`, params);
    } else if (nativeAnalytics) {
      await nativeAnalytics. logEvent(eventName, params);
      console.log(`📊 [Analytics] Event: ${eventName}`, params);
    }
  } catch (error) {
    console.warn('⚠️ [Analytics] Failed to log event:', error);
  }
};

/**
 * Log select content event
 */
export const logSelectContent = async (
  contentType: string,
  itemId: string
): Promise<void> => {
  await logEvent('select_content', {
    content_type: contentType,
    item_id:  itemId,
  });
};

/**
 * Log search event
 */
export const logSearch = async (searchTerm: string): Promise<void> => {
  await logEvent('search', {
    search_term: searchTerm,
  });
};

/**
 * Log view item event (for viewing offers, catalogues, etc.)
 */
export const logViewItem = async (
  itemId: string,
  itemName: string,
  itemCategory?:  string,
  additionalParams?: Record<string, any>
): Promise<void> => {
  await logEvent('view_item', {
    item_id: itemId,
    item_name: itemName,
    item_category:  itemCategory,
    ... additionalParams,
  });
};

/**
 * Log catalogue view
 */
export const logCatalogueView = async (
  catalogueId:  string,
  catalogueName: string,
  storeId:  string
): Promise<void> => {
  await logEvent('view_catalogue', {
    catalogue_id:  catalogueId,
    catalogue_name:  catalogueName,
    store_id:  storeId,
  });
};

/**
 * Log offer view
 */
export const logOfferView = async (
  offerId: string,
  offerName: string,
  price: number
): Promise<void> => {
  await logEvent('view_offer', {
    offer_id: offerId,
    offer_name: offerName,
    price: price,
  });
};

/**
 * Log add to cart/basket
 */
export const logAddToCart = async (
  itemId: string,
  itemName: string,
  price: number,
  additionalParams?: Record<string, any>
): Promise<void> => {
  await logEvent('add_to_cart', {
    item_id: itemId,
    item_name:  itemName,
    price: price,
    currency: 'EGP',
    ...additionalParams,
  });
};

/**
 * Log add to basket (alias for logAddToCart)
 */
export const logAddToBasket = logAddToCart;

/**
 * Set user ID for analytics
 */
export const setAnalyticsUserId = async (userId: string | null): Promise<void> => {
  try {
    if (Platform.OS === 'web' && webAnalytics) {
      const { setUserId } = await import('firebase/analytics');
      setUserId(webAnalytics, userId);
      console.log(`📊 [Analytics] User ID set:  ${userId ?  'yes' : 'cleared'}`);
    } else if (nativeAnalytics) {
      await nativeAnalytics. setUserId(userId);
      console.log(`📊 [Analytics] User ID set: ${userId ?  'yes' :  'cleared'}`);
    }
  } catch (error) {
    console.warn('⚠️ [Analytics] Failed to set user ID:', error);
  }
};

/**
 * Set user property
 */
export const setUserProperty = async (
  name: string,
  value: string | null
): Promise<void> => {
  try {
    if (Platform.OS === 'web' && webAnalytics) {
      const { setUserProperties } = await import('firebase/analytics');
      setUserProperties(webAnalytics, { [name]: value });
      console.log(`📊 [Analytics] User property set:  ${name}`);
    } else if (nativeAnalytics) {
      await nativeAnalytics.setUserProperty(name, value);
      console.log(`📊 [Analytics] User property set: ${name}`);
    }
  } catch (error) {
    console.warn('⚠️ [Analytics] Failed to set user property:', error);
  }
};

/**
 * Set user governorate for analytics segmentation
 */
export const setUserGovernorate = async (governorate: string | null): Promise<void> => {
  await setUserProperty('user_governorate', governorate);
};

// Export as a service object for convenience
export const analyticsService = {
  initialize: initializeAnalytics,
  logScreenView,
  logEvent,
  logSelectContent,
  logSearch,
  logViewItem,
  logCatalogueView,
  logOfferView,
  logAddToCart,
  logAddToBasket,
  setUserId:  setAnalyticsUserId,
  setUserProperty,
  setUserGovernorate,
};

export default analyticsService;