// components/stores/StoreCard.tsx - FIXED: Logo alignment for RTL
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '../common';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { useLocalized } from '../../hooks';
import { useAppSelector } from '../../store/hooks';
import {
  getBranchCountText,
  getGovernorateName,
  getCityName,
  type GovernorateId,
  type CityId
} from '../../data/stores';
import type { Store } from '../../types';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  hideBranchCount?: boolean;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onPress,
  isFavorite = false,
  onToggleFavorite,
  hideBranchCount = false,
}) => {
  const { getName } = useLocalized();

  const userGovernorate = useAppSelector(state => state.settings.userGovernorate) as GovernorateId | null;
  const userCity = useAppSelector(state => state.settings.userCity) as CityId | null;

  // Filter branches based on user location (only for stores with branches)
  const relevantBranches = React.useMemo(() => {
    if (!store.branches || store.branches.length === 0) {
      return [];
    }

    // For national stores, show all branches
    if (!store.isLocal) {
      // Filter by user location if set
      if (userGovernorate) {
        let filtered = store.branches.filter(b => b.governorate === userGovernorate);
        if (userCity) {
          filtered = filtered.filter(b => b.city === userCity);
        }
        return filtered;
      }
      return store.branches;
    }

    // For local stores with branches, filter by user location
    if (userGovernorate) {
      let filtered = store.branches.filter(b => b.governorate === userGovernorate);
      if (userCity) {
        filtered = filtered.filter(b => b.city === userCity);
      }
      return filtered;
    }

    return store.branches;
  }, [store.branches, store.isLocal, userGovernorate, userCity]);

  // Get location display text
  const getLocationText = () => {
    const branchCount = relevantBranches.length;
    const totalBranches = store.branches?.length || 0;

    // For local stores WITHOUT branches, show governorate-based info
    if (store.isLocal && totalBranches === 0) {
      if (store.governorate) {
        const governorateName = getGovernorateName(store.governorate as GovernorateId);
        return `متاح في ${governorateName}`;
      }
      return 'متجر محلي';
    }

    // For local stores WITH branches
    if (store.isLocal && store.governorate && totalBranches > 0) {
      const governorateName = getGovernorateName(store.governorate as GovernorateId);

      if (userGovernorate === store.governorate) {
        if (userCity) {
          const cityBranches = relevantBranches.filter(b => b.city === userCity);
          if (cityBranches.length > 0) {
            const cityName = getCityName(userCity);
            return `${cityBranches.length} ${cityBranches.length === 1 ? 'فرع' : 'فروع'} في ${cityName}`;
          }
          return `لا توجد فروع في ${getCityName(userCity)}`;
        }
        return `${branchCount} ${branchCount === 1 ? 'فرع' : 'فروع'} في ${governorateName}`;
      }

      return `متاح في ${governorateName}`;
    }

    // For national stores
    if (totalBranches === 0) {
      return 'لا توجد فروع';
    }

    if (userGovernorate) {
      if (userCity) {
        const cityBranches = relevantBranches.filter(b => b.city === userCity);
        if (cityBranches.length > 0) {
          const cityName = getCityName(userCity);
          return `${cityBranches.length} ${cityBranches.length === 1 ? 'فرع' : 'فروع'} في ${cityName}`;
        }
        const governorateBranches = relevantBranches.filter(b => b.governorate === userGovernorate);
        if (governorateBranches.length > 0) {
          const governorateName = getGovernorateName(userGovernorate);
          return `${governorateBranches.length} ${governorateBranches.length === 1 ? 'فرع' : 'فروع'} في ${governorateName}`;
        }
        return `${totalBranches} ${totalBranches === 1 ? 'فرع' : 'فروع'} على مستوى الجمهورية`;
      }

      const governorateBranches = relevantBranches.filter(b => b.governorate === userGovernorate);
      if (governorateBranches.length > 0) {
        const governorateName = getGovernorateName(userGovernorate);
        return `${governorateBranches.length} ${governorateBranches.length === 1 ? 'فرع' : 'فروع'} في ${governorateName}`;
      }

      return `${totalBranches} ${totalBranches === 1 ? 'فرع' : 'فروع'} على مستوى الجمهورية`;
    }

    if (totalBranches === 1) return 'فرع واحد';
    if (totalBranches === 2) return 'فرعان';

    const uniqueGovernorates = [...new Set(store.branches.map(b => b.governorate))];
    if (uniqueGovernorates.length === 1) {
      const govName = getGovernorateName(uniqueGovernorates[0] as GovernorateId);
      return `${totalBranches} فروع في ${govName}`;
    }

    return `${totalBranches} فروع في عدة محافظات`;
  };

  const locationText = getLocationText();

  // Only grey out local stores with branches that don't match user location
  // Local stores WITHOUT branches should NEVER be greyed out
  const hasNoBranchesInUserLocation =
    store.isLocal &&
    store.branches && store.branches.length > 0 && // Only if store HAS branches
    relevantBranches.length === 0 &&
    userGovernorate !== null;

  // ✅ Handle both require() and URI logos
  const getLogoSource = () => {
    if (typeof store.logo === 'string') {
      return { uri: store.logo };
    }
    return store.logo;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        hasNoBranchesInUserLocation && styles.containerDisabled
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* ✅ FIXED: Logo container with proper alignment */}
      <View style={styles.logoContainer}>
        <CachedImage
          source={getLogoSource()}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{getName(store)}</Text>
        <View style={styles.infoContainer}>
          {/* Conditionally render branch count based on hideBranchCount prop */}
          {!hideBranchCount && (
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={hasNoBranchesInUserLocation ? colors.gray[400] : colors.textSecondary}
              />
              <Text style={[
                styles.infoText,
                hasNoBranchesInUserLocation && styles.infoTextDisabled
              ]}>
                {locationText}
              </Text>
            </View>
          )}

          <View style={styles.badgesRow}>
            {store.isLocal && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>متاجر محلية</Text>
              </View>
            )}

            {hasNoBranchesInUserLocation && (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableBadgeText}>غير متاح في منطقتك</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? colors.primary : colors.gray[400]}
            />
          </TouchableOpacity>
        )}
        <Ionicons
          name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
          size={24}
          color={colors.gray[400]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  // ✅ FIXED: Separate container for logo with consistent spacing
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    marginRight: I18nManager.isRTL ? 0 : spacing.md,
    marginLeft: I18nManager.isRTL ? spacing.md : 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  infoContainer: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  infoTextDisabled: {
    color: colors.gray[400],
  },
  badgesRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  localBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  localBadgeText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
  },
  unavailableBadge: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  unavailableBadgeText: {
    fontSize: 10,
    color: colors.gray[600],
    fontWeight: '600',
  },
  actions: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: spacing.xs,
    marginRight: I18nManager.isRTL ? 0 : spacing.sm,
    marginLeft: I18nManager.isRTL ? spacing.sm : 0,
  },
});

export default StoreCard;