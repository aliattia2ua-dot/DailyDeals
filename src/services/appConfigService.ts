// src/services/appConfigService.ts
import firestore from '@react-native-firebase/firestore';
import { AppConfig, DEFAULT_APP_CONFIG } from '../types/appConfig';

const APP_CONFIG_DOC = 'config/app';

/**
 * Fetch app config once
 */
export const fetchAppConfig = async (): Promise<AppConfig> => {
  try {
    const docRef = firestore().doc(APP_CONFIG_DOC);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      console.log('✅ [AppConfig] Fetched from Firestore');
      return { ...DEFAULT_APP_CONFIG, ...docSnap.data() } as AppConfig;
    }

    console.log('⚠️ [AppConfig] No config found, using defaults');
    return DEFAULT_APP_CONFIG;
  } catch (error) {
    console.error('❌ [AppConfig] Error fetching:', error);
    return DEFAULT_APP_CONFIG;
  }
};

/**
 * Subscribe to real-time app config changes
 */
export const subscribeToAppConfig = (
  onUpdate: (config: AppConfig) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const docRef = firestore().doc(APP_CONFIG_DOC);

    const unsubscribe = docRef.onSnapshot(
      (docSnap) => {
        if (docSnap.exists) {
          console.log('🔄 [AppConfig] Real-time update received');
          const config = { ...DEFAULT_APP_CONFIG, ...docSnap.data() } as AppConfig;
          onUpdate(config);
        } else {
          console.log('⚠️ [AppConfig] No config in snapshot, using defaults');
          onUpdate(DEFAULT_APP_CONFIG);
        }
      },
      (error) => {
        console.error('❌ [AppConfig] Snapshot error:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ [AppConfig] Subscribe error:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Compare version strings (e.g., "1.2.3")
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
};

/**
 * Check if current version needs update
 */
export const checkVersionUpdate = (
  currentVersion: string,
  config: AppConfig
): {
  needsUpdate: boolean;
  forceUpdate: boolean;
  message: { ar: string; en: string };
} => {
  const { minimumVersion, latestVersion, forceUpdate, updateMessage } = config.versionControl;

  // Check if below minimum (force update)
  if (compareVersions(currentVersion, minimumVersion) < 0) {
    return {
      needsUpdate: true,
      forceUpdate: true,
      message: updateMessage,
    };
  }

  // Check if below latest (optional update)
  if (compareVersions(currentVersion, latestVersion) < 0) {
    return {
      needsUpdate: true,
      forceUpdate: forceUpdate,
      message: updateMessage,
    };
  }

  return {
    needsUpdate: false,
    forceUpdate: false,
    message: updateMessage,
  };
};

/**
 * Check if announcement should be shown
 */
export const shouldShowAnnouncement = (config: AppConfig): boolean => {
  const { enabled, startDate, endDate } = config.announcementBar;

  if (!enabled) return false;

  const now = new Date();

  if (startDate) {
    const start = new Date(startDate);
    if (now < start) return false;
  }

  if (endDate) {
    const end = new Date(endDate);
    if (now > end) return false;
  }

  return true;
};
