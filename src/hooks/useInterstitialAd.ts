// src/hooks/useInterstitialAd.ts
import { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { isDateRangeActive } from '../utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVIGATION_COUNT_KEY = '@interstitial_nav_count';

export const useInterstitialAd = () => {
  const config = useAppSelector((state) => state.appConfig.config);
  const [showAd, setShowAd] = useState(false);
  const [currentAd, setCurrentAd] = useState<any>(null);

  const checkAndShowAd = async () => {
    if (!config.features.enableAds || !config.advertisements.enabled || !config.advertisements.interstitialAds.enabled) {
      return;
    }

    // Get navigation count
    const countStr = await AsyncStorage.getItem(NAVIGATION_COUNT_KEY);
    const count = countStr ? parseInt(countStr) : 0;
    const newCount = count + 1;

    await AsyncStorage.setItem(NAVIGATION_COUNT_KEY, newCount.toString());

    // Check if we should show ad
    if (newCount >= config.advertisements.interstitialAds.frequency) {
      // Reset counter
      await AsyncStorage.setItem(NAVIGATION_COUNT_KEY, '0');

      // Get active ads
      const activeAds = config.advertisements.interstitialAds.ads
        .filter(ad => ad.isActive && isDateRangeActive(ad.startDate, ad.endDate));

      if (activeAds.length > 0) {
        // Show random ad
        const randomAd = activeAds[Math.floor(Math.random() * activeAds.length)];
        setCurrentAd(randomAd);
        setShowAd(true);
      }
    }
  };

  const dismissAd = () => {
    setShowAd(false);
    setCurrentAd(null);
  };

  return {
    showAd,
    currentAd,
    checkAndShowAd,
    dismissAd,
  };
};