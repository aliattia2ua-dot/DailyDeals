// src/components/common/AdBanner.tsx
// UPDATED: Each ad has its own positions array + Fixed date validation
import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Text,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../store/hooks';
import { AdBanner as AdBannerType } from '../../types/appConfig';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { isDateRangeActive } from '../../utils/dateUtils';

interface AdBannerProps {
  position: 'home' | 'flyers' | 'search' | 'store';
  maxAds?: number; // Maximum number of ads to show
  horizontal?: boolean; // Show ads horizontally
}

export const AdBanner: React.FC<AdBannerProps> = ({
  position,
  maxAds,
  horizontal = false
}) => {
  const { i18n } = useTranslation();
  const config = useAppSelector((state) => state.appConfig.config);

  console.log('🎯 [AdBanner] Checking ads for position:', position);
  console.log('📊 [AdBanner] Master toggles:', {
    enableAds: config.features.enableAds,
    adsEnabled: config.advertisements.enabled,
    bannerAdsEnabled: config.advertisements.bannerAds.enabled,
  });

  // Check master toggles
  if (!config.features.enableAds) {
    console.log('❌ [AdBanner] Master ads disabled (features.enableAds)');
    return null;
  }

  if (!config.advertisements.enabled) {
    console.log('❌ [AdBanner] Advertisements disabled');
    return null;
  }

  if (!config.advertisements.bannerAds.enabled) {
    console.log('❌ [AdBanner] Banner ads disabled');
    return null;
  }

  console.log(`📢 [AdBanner] Total ads in config: ${config.advertisements.bannerAds.ads.length}`);

  // Filter ads for this position
  const filteredAds = config.advertisements.bannerAds.ads.filter(ad => {
    console.log(`\n🔍 [AdBanner] Checking ad "${ad.id}":`);
    console.log('   - Title:', ad.titleAr || ad.titleEn);
    console.log('   - isActive:', ad.isActive);
    console.log('   - positions:', ad.positions);
    console.log('   - startDate:', ad.startDate || 'none');
    console.log('   - endDate:', ad.endDate || 'none');

    // Check if ad is active
    if (!ad.isActive) {
      console.log('   ❌ Ad is inactive');
      return false;
    }

    // Check if ad has positions for this screen
    if (!ad.positions || !ad.positions.includes(position)) {
      console.log(`   ❌ Position "${position}" not in ad's positions:`, ad.positions);
      return false;
    }

    // ✅ FIX: If both dates are missing/empty, ad is ALWAYS active
    if (!ad.startDate && !ad.endDate) {
      console.log('   ✅ No dates specified - ALWAYS ACTIVE');
      return true;
    }

    // Check date range if dates are provided
    const hasValidDates = isDateRangeActive(ad.startDate, ad.endDate);
    console.log('   - hasValidDates:', hasValidDates);

    if (!hasValidDates) {
      console.log('   ❌ Date range not valid');
      return false;
    }

    console.log('   ✅ Ad passed all checks');
    return true;
  });

  console.log(`\n✅ [AdBanner] Found ${filteredAds.length} valid ads for position "${position}"`);

  if (filteredAds.length === 0) {
    console.log('❌ [AdBanner] No ads to display');
    return null;
  }

  // Sort by priority (highest first)
  const sortedAds = filteredAds.sort((a, b) => b.priority - a.priority);

  // Limit ads if maxAds is specified
  const adsToShow = maxAds ? sortedAds.slice(0, maxAds) : sortedAds;

  console.log(`📢 [AdBanner] Displaying ${adsToShow.length} ad(s)`);

  const handlePress = async (ad: AdBannerType) => {
    console.log('🔗 [AdBanner] Attempting to open:', ad.targetUrl);
    try {
      let url = ad.targetUrl;

      // Add https:// if missing protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
        console.log('🔧 [AdBanner] Added https://, new URL:', url);
      }

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        console.log('✅ [AdBanner] URL opened successfully');
      } else {
        console.error('❌ [AdBanner] Cannot open URL:', url);
      }
    } catch (error) {
      console.error('❌ [AdBanner] Error opening URL:', error);
    }
  };

  const renderAd = (ad: AdBannerType, index: number) => {
    const title = i18n.language === 'ar' ? ad.titleAr : ad.titleEn;

    return (
      <TouchableOpacity
        key={ad.id}
        style={[
          styles.container,
          horizontal && index < adsToShow.length - 1 && styles.horizontalMargin
        ]}
        onPress={() => handlePress(ad)}
        activeOpacity={0.8}
      >
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>
            {i18n.language === 'ar' ? 'إعلان' : 'Ad'}
          </Text>
        </View>
        <Image
          source={{ uri: ad.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={(e) => console.error('❌ [AdBanner] Image load error:', e.nativeEvent.error)}
          onLoad={() => console.log('✅ [AdBanner] Image loaded:', ad.imageUrl)}
        />
        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // If horizontal and multiple ads, use ScrollView
  if (horizontal && adsToShow.length > 1) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
        style={styles.scrollView}
      >
        {adsToShow.map((ad, index) => renderAd(ad, index))}
      </ScrollView>
    );
  }

  // Otherwise, stack vertically
  return (
    <View style={styles.verticalContainer}>
      {adsToShow.map((ad, index) => renderAd(ad, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  verticalContainer: {
    width: '100%',
  },
  horizontalContainer: {
    paddingHorizontal: spacing.md,
  },
  scrollView: {
    marginVertical: spacing.md,
  },
  container: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginVertical: spacing.md,
    backgroundColor: colors.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  horizontalMargin: {
    marginRight: spacing.md,
    width: 300,
  },
  adBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    zIndex: 1,
  },
  adBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 120,
  },
  titleContainer: {
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});