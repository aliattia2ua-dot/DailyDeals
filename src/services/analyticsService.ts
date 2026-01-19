// src/services/analyticsService.ts - React Native Firebase Analytics & Crashlytics
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

let isInitialized = false;

/**
 * Initialize analytics
 */
export const initializeAnalytics = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    console.log('✅ [Analytics] React Native Firebase analytics and crashlytics ready');
    isInitialized = true;
  } catch (error) {
    console.warn('⚠️ [Analytics] Failed to initialize:', error);
  }
};

/**
 * Log screen view
 */
export const logScreenView = async (screenName: string, screenClass?: string): Promise<void> => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log(`📊 [Analytics] Screen view: ${screenName}`);
  } catch (error) {
    console.warn('⚠️ [Analytics] Failed to log screen view:', error);
  }
};

/**
 * Log custom event
 */
export const logEvent = async (
  eventName: string,
  params?: Record<string, any>
): Promise<void> => {
  try {
    await analytics().logEvent(eventName, params);
    console.log(`📊 [Analytics] Event: ${eventName}`, params);
  } catch (error) {
    console.warn('⚠️ [Analytics] Failed to log event:', error);
  }
};

/**
 * Log error with Crashlytics
 */
export const logError = (error: Error, context?: string): void => {
  try {
    if (context) {
      crashlytics().log(context);
    }
    crashlytics().recordError(error);
    console.log(`🐛 [Crashlytics] Error logged: ${error.message}`);
  } catch (e) {
    console.warn('⚠️ [Crashlytics] Failed to log error:', e);
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
 * Set user ID for analytics and crashlytics
 */
export const setAnalyticsUserId = async (userId: string | null): Promise<void> => {
  try {
    await analytics().setUserId(userId);
    if (userId) {
      await crashlytics().setUserId(userId);
    }
    console.log(`📊 [Analytics] User ID set: ${userId ? 'yes' : 'cleared'}`);
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
    await analytics().setUserProperty(name, value);
    console.log(`📊 [Analytics] User property set: ${name}`);
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