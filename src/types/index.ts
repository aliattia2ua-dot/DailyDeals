// src/types/index.ts - COMPLETE UPDATED VERSION WITH LOCATION

import { ImageSourcePropType } from 'react-native';

/**
 * Store Type - Updated with categories and local store support
 */
export interface Store {
  id: string;
  nameAr: string;
  nameEn: string;
  logo: string | ImageSourcePropType;
  categories?: string[];
  branches: Branch[];
  isLocal?: boolean;
  governorate?: string;
}

/**
 * Branch Type - Updated to support local store names
 */
export interface Branch {
  id: string;
  storeId: string;
  storeName?: string;
  storeNameEn?: string;
  addressAr: string;
  addressEn: string;
  governorate: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  openingHours: string;
}

/**
 * Catalogue Page Type
 */
export interface CataloguePage {
  pageNumber: number;
  imageUrl: string;
  offers: Offer[];
}

/**
 * Catalogue Type - UPDATED with categoryId and local store fields
 */
export interface Catalogue {
  id: string;
  storeId: string;
  storeName?: string;
  categoryId?: string;
  titleAr: string;
  titleEn: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  pdfUrl?: string;
  pages: CataloguePage[];
  totalPages?: number;
  pdfProcessed?: boolean;
  createdAt?: any;
  updatedAt?: any;
  // Local store fields
  isLocalStore?: boolean;
  localStoreGovernorate?: string;
  localStoreNameId?: string;
  localStoreNameAr?: string;
  localStoreNameEn?: string;
}

/**
 * Offer Type - Base offer structure
 */
export interface Offer {
  id: string;
  storeId: string;
  catalogueId: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl: string;
  offerPrice: number;
  originalPrice?: number;
  unit?: string;
  pageNumber?: number;
  isActive: boolean;
  catalogueStartDate?: string;
  catalogueEndDate?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Basket Item Type - COMPLETE WITH ALL REQUIRED FIELDS
 */
export interface BasketItem {
  id: string;
  type: 'offer' | 'page' | 'pdf-page';
  quantity: number;
  storeName: string;
  offerEndDate?: string;
  offerStartDate?: string;
  addedAt: string;

  offer?: Offer & {
    storeName?: string;
    catalogueTitle?: string;
    catalogueStartDate?: string;
    catalogueEndDate?: string;
  };

  cataloguePage?: {
    catalogueId: string;
    catalogueTitle: string;
    pageNumber: number;
    imageUrl: string;
    storeName?: string;
    offers?: string[];
  };

  pdfPage?: {
    catalogueId: string;
    catalogueTitle: string;
    storeId: string;
    storeName: string;
    pageNumber: number;
    pageImageUri: string;
    savedAt?: string;
  };
}

/**
 * User Profile Type - ✅ UPDATED WITH PHONE NUMBER
 */
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAdmin: boolean;
  phoneNumber?: string | null; // ✅ NEW

  // Location preferences
  location?: {
    governorate: string | null;
    city: string | null;
  };

  preferences?: {
    language: 'ar' | 'en';
    notifications: boolean;
  };
  createdAt: any;
  lastLoginAt: any;
}

/**
 * Favorites State Type - UPDATED for subcategories
 */
export interface FavoritesState {
  subcategoryIds: string[];
  storeIds: string[];
  catalogueIds?: string[];
}

/**
 * Auth State Type
 */
export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Stores State Type
 */
export interface StoresState {
  stores: Store[];
  loading: boolean;
  error: string | null;
}

/**
 * Offers State Type
 */
export interface OffersState {
  catalogues: Catalogue[];
  loading: boolean;
  error: string | null;
}

/**
 * Basket State Type
 */
export interface BasketState {
  items: BasketItem[];
  total: number;
}

/**
 * Settings State Type - UPDATED WITH LOCATION
 */
export interface SettingsState {
  userGovernorate: string | null;
  userCity: string | null;
  language: 'ar' | 'en';
  notificationsEnabled: boolean;
  isRTL?: boolean;
}

/**
 * Root State Type (for Redux)
 */
export interface RootState {
  auth: AuthState;
  stores: StoresState;
  offers: OffersState;
  basket: BasketState;
  favorites: FavoritesState;
  settings: SettingsState;
}

/**
 * Helper Types
 */
export type MainCategoryId = 'food_groceries' | 'electronics' | 'home' | 'fashion';

export interface CategoryFilter {
  mainCategory?: MainCategoryId;
  subcategory?: string;
}

export interface OfferWithCatalogueInfo extends Offer {
  storeName: string;
  catalogueTitle: string;
  catalogueStartDate: string;
  catalogueEndDate: string;
}

export interface CatalogueWithCategory extends Catalogue {
  categoryName?: string;
  categoryNameEn?: string;
}

export interface CategoryHierarchy {
  main: Category;
  sub?: Category;
}

export interface OfferSearchParams {
  categoryId?: string;
  storeId?: string;
  catalogueId?: string;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  isActive?: boolean;
}

export interface CatalogueSearchParams {
  storeId?: string;
  categoryId?: string;
  status?: 'active' | 'upcoming' | 'expired';
  startDate?: string;
  endDate?: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon?: string;
  parentId?: string;
}

export type Timestamp = any;
export interface SettingsState {
  language: 'ar' | 'en';
  notificationsEnabled: boolean;
  isRTL: boolean;
  userGovernorate: string | null;
  userCity: string | null;
}

// Also ensure UserProfile has location
