// src/assets/logoRegistry.ts
// Centralized logo imports for all stores

export const storeLogos = {
  // Multi-category stores
  carrefour: require('./logos/carrefour.png'),
  hyperone: require('./logos/hyperone.png'),
  kazyon: require('./logos/kazyon.png'),
  awladragab: require('./logos/awladragab.png'),
  
  // Food-focused stores
  metro: require('./logos/metro.png'),
  spinneys: require('./logos/spinneys.png'),
  seoudi: require('./logos/seoudi.png'),
  kheirzaman: require('./logos/kheirzaman.png'),
  fathalla: require('./logos/fathalla.png'),
  bim: require('./logos/bim.png'),
  
  // Electronics stores
  btech: require('./logos/btech.png'),
  oscar: require('./logos/oscar.png'),
  extra: require('./logos/extra.png'),
  
  // Local stores by governorate
  sharkia_local: require('./logos/sharkia_local.png'),
  dakahlia_local: require('./logos/dakahlia_local.png'),
  cairo_local: require('./logos/cairo_local.png'),
} as const;

export type StoreLogoKey = keyof typeof storeLogos;

// Helper function to get logo by store ID
export const getStoreLogo = (storeId: string) => {
  return storeLogos[storeId as StoreLogoKey] || null;
};
