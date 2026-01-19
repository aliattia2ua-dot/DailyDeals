// App configuration constants
export const APP_CONFIG = {
  name: 'عروض مصر',
  nameEn: 'Offer Catalog',
  version: '1.0.0',
  defaultLanguage: 'ar' as const,
  supportedLanguages: ['ar', 'en'] as const,
  currency: 'EGP',
  currencySymbol: 'ج.م',
};

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  BASKET: '@offer_catalog/basket',
  FAVORITES: '@offer_catalog/favorites',
  SETTINGS: '@offer_catalog/settings',
  LANGUAGE: '@offer_catalog/language',
  NOTIFICATIONS: '@offer_catalog/notifications',
};

// API Configuration (placeholder for future backend)
export const API_CONFIG = {
  baseUrl: 'https://api.offercatalog.eg', // Placeholder
  timeout: 30000,
};

// Map configuration for Leaflet
export const MAP_CONFIG = {
  defaultCenter: {
    latitude: 30.5877, // Zagazig coordinates
    longitude: 31.5020,
  },
  defaultZoom: 13,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
};

// Notification topics
export const NOTIFICATION_TOPICS = {
  NEW_OFFERS: 'new_offers',
  EXPIRING_OFFERS: 'expiring_offers',
  FAVORITE_STORES: 'favorite_stores',
};
