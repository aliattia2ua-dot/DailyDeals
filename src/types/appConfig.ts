// src/types/appConfig.ts - UPDATED: Added layout-level ad positions
export interface AppConfig {
  versionControl: {
    minimumVersion: string;
    latestVersion: string;
    forceUpdate: boolean;
    updateMessage: {
      ar: string;
      en: string;
    };
    updateUrl: {
      ios: string;
      android: string;
      web: string;
    };
  };

  announcementBar: {
    enabled: boolean;
    dismissible: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
    priority: 'low' | 'medium' | 'high';
    message: {
      ar: string;
      en: string;
    };
    action?: {
      label: {
        ar: string;
        en: string;
      };
      url?: string;
      route?: string;
    };
    startDate?: string;
    endDate?: string;
  };

  advertisements: {
    enabled: boolean;
    bannerAds: {
      enabled: boolean;
      ads: AdBanner[];
    };
    interstitialAds: {
      enabled: boolean;
      frequency: number;
      ads: InterstitialAd[];
    };
  };

  features: {
    enableSearch: boolean;
    enableBasket: boolean;
    enableFavorites: boolean;
    maintenanceMode: boolean;
    enableAds: boolean;
  };
}

// ✅ UPDATED: Added layout-level positions
export type AdPosition =
  | 'home'              // Home screen content
  | 'flyers'            // Flyers screen content
  | 'search'            // Search screen content
  | 'store'             // Store details content
  | 'tabs_persistent'   // Top of tabs layout (always visible)
  | 'tabs_bottom';      // Bottom of tabs layout (above tab bar)

export interface AdBanner {
  id: string;
  imageUrl: string;
  targetUrl: string;
  titleAr: string;
  titleEn: string;
  priority: number;
  positions: AdPosition[]; // ✅ Now uses AdPosition type
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface InterstitialAd {
  id: string;
  imageUrl: string;
  targetUrl: string;
  titleAr: string;
  titleEn: string;
  dismissDelay: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  versionControl: {
    minimumVersion: '1.0.0',
    latestVersion: '1.0.0',
    forceUpdate: false,
    updateMessage: {
      ar: 'يرجى تحديث التطبيق للحصول على أحدث الميزات',
      en: 'Please update the app to get the latest features',
    },
    updateUrl: {
      ios: 'https://apps.apple.com/app/your-app',
      android: 'https://play.google.com/store/apps/details?id=com.yourcompany.offercatalog',
      web: 'https://yourapp.com',
    },
  },
  announcementBar: {
    enabled: false,
    dismissible: true,
    type: 'info',
    priority: 'medium',
    message: {
      ar: '',
      en: '',
    },
  },
  advertisements: {
    enabled: false,
    bannerAds: {
      enabled: false,
      ads: [],
    },
    interstitialAds: {
      enabled: false,
      frequency: 5,
      ads: [],
    },
  },
  features: {
    enableSearch: true,
    enableBasket: true,
    enableFavorites: true,
    maintenanceMode: false,
    enableAds: false,
  },
};