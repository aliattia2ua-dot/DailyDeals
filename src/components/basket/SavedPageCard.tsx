// src/components/basket/SavedPageCard.tsx - FAVORITE BUTTON ON RIGHT SIDE
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { formatDateAr, getDaysRemaining, isDateExpired } from '../../utils/dateUtils';
import type { BasketItem } from '../../types';

interface SavedPageCardProps {
  item: BasketItem;
  onRemove: () => void;
  onViewPage: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const SavedPageCard: React.FC<SavedPageCardProps> = ({
  item,
  onRemove,
  onViewPage,
  isFavorite = false,
  onToggleFavorite,
}) => {
  if (!item.cataloguePage) return null;

  const { cataloguePage, storeName, offerEndDate } = item;

  // Get offers count safely
  const offersCount = cataloguePage.offers?.length || 0;

  // Calculate expiry status
  const isExpired = offerEndDate ? isDateExpired(offerEndDate) : false;
  const daysRemaining = offerEndDate ? getDaysRemaining(offerEndDate) : -1;

  return (
    <TouchableOpacity
      style={[styles.container, isExpired && styles.containerExpired]}
      onPress={onViewPage}
      activeOpacity={0.7}
    >
      {/* Expired Badge - Bottom Left */}
      {isExpired && (
        <View style={styles.expiredBadge}>
          <Ionicons name="time-outline" size={14} color={colors.white} />
          <Text style={styles.expiredBadgeText}>منتهي</Text>
        </View>
      )}

      {/* Favorite Button - Top Right (MOVED) */}
      {onToggleFavorite && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? colors.primary : colors.gray[400]}
          />
        </TouchableOpacity>
      )}

      <Image
        source={{ uri: cataloguePage.imageUrl }}
        style={[styles.image, isExpired && styles.imageExpired]}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <Ionicons name="bookmark" size={16} color={colors.primary} />
            <Text style={styles.badge}>صفحة محفوظة</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, isExpired && styles.textExpired]} numberOfLines={2}>
          {cataloguePage.catalogueTitle}
        </Text>

        <Text style={[styles.storeName, isExpired && styles.textExpired]}>
          {storeName}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons
              name="document-outline"
              size={14}
              color={isExpired ? colors.gray[400] : colors.textSecondary}
            />
            <Text style={[styles.infoText, isExpired && styles.textExpired]}>
              صفحة {cataloguePage.pageNumber}
            </Text>
          </View>
          {offersCount > 0 && (
            <View style={styles.infoItem}>
              <Ionicons
                name="pricetag-outline"
                size={14}
                color={isExpired ? colors.gray[400] : colors.textSecondary}
              />
              <Text style={[styles.infoText, isExpired && styles.textExpired]}>
                {offersCount} {offersCount === 1 ? 'عرض' : 'عروض'}
              </Text>
            </View>
          )}
        </View>

        {offerEndDate && (
          <View style={[
            styles.expiryContainer,
            isExpired && styles.expiryContainerExpired,
            !isExpired && daysRemaining <= 2 && styles.expiryContainerWarning
          ]}>
            <Ionicons
              name="time-outline"
              size={14}
              color={isExpired ? colors.gray[500] : (daysRemaining <= 2 ? colors.error : colors.warning)}
            />
            <Text style={[
              styles.expiryText,
              isExpired && styles.textExpired,
              !isExpired && daysRemaining <= 2 && styles.expiryTextUrgent
            ]}>
              {isExpired ? (
                <>انتهى في {formatDateAr(offerEndDate)}</>
              ) : daysRemaining === 0 ? (
                <>ينتهي اليوم!</>
              ) : daysRemaining === 1 ? (
                <>ينتهي غداً</>
              ) : (
                <>ينتهي {formatDateAr(offerEndDate)}</>
              )}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...shadows.sm,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '20',
    position: 'relative',
  },
  containerExpired: {
    backgroundColor: colors.gray[50],
    opacity: 0.7,
    borderColor: colors.gray[300],
  },
  expiredBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: I18nManager.isRTL ? undefined : spacing.sm,
    right: I18nManager.isRTL ? spacing.sm : undefined,
    backgroundColor: colors.gray[500],
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    zIndex: 1,
  },
  expiredBadgeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: I18nManager.isRTL ? undefined : '25%', // Second quarter from right
    left: I18nManager.isRTL ? '25%' : undefined, // Second quarter from left in RTL
    transform: [{ translateX: I18nManager.isRTL ? 16 : -16 }], // Center it in the quarter
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  image: {
    width: 80,
    height: 120,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    marginRight: I18nManager.isRTL ? 0 : spacing.md,
    marginLeft: I18nManager.isRTL ? spacing.md : 0,
  },
  imageExpired: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  badgeContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badge: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: I18nManager.isRTL ? 0 : spacing.xs,
    marginRight: I18nManager.isRTL ? spacing.xs : 0,
  },
  removeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    marginBottom: spacing.xs,
  },
  storeName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginLeft: I18nManager.isRTL ? 0 : spacing.xs,
    marginRight: I18nManager.isRTL ? spacing.xs : 0,
  },
  expiryContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderRadius: borderRadius.sm,
  },
  expiryContainerWarning: {
    backgroundColor: colors.error + '15',
  },
  expiryContainerExpired: {
    backgroundColor: 'transparent',
  },
  expiryText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    marginLeft: I18nManager.isRTL ? 0 : spacing.xs,
    marginRight: I18nManager.isRTL ? spacing.xs : 0,
    fontWeight: '500',
  },
  expiryTextUrgent: {
    color: colors.error,
    fontWeight: '600',
  },
  textExpired: {
    color: colors.gray[500],
  },
});

export default SavedPageCard;