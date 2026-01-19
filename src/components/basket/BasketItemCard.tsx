// src/components/basket/BasketItemCard.tsx - FAVORITE BUTTON ON RIGHT SIDE
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { formatCurrency } from '../../utils/helpers';
import { formatDateAr, getDaysRemaining } from '../../utils/dateUtils';
import { useLocalized } from '../../hooks';
import type { BasketItem } from '../../types';

interface BasketItemCardProps {
  item: BasketItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  onPress?: () => void;
  isExpired?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const BasketItemCard: React.FC<BasketItemCardProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  onPress,
  isExpired = false,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const { getName } = useLocalized();

  // Only render if this is an offer type basket item
  if (item.type !== 'offer' || !item.offer) {
    return null;
  }

  const daysRemaining = getDaysRemaining(item.offerEndDate);

  const containerContent = (
    <View style={[styles.container, isExpired && styles.containerExpired]}>
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
            e?.stopPropagation?.();
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
        source={{ uri: item.offer.imageUrl }}
        style={[styles.image, isExpired && styles.imageExpired]}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, isExpired && styles.textExpired]} numberOfLines={2}>
            {getName(item.offer)}
          </Text>
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              onRemove();
            }}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.storeName, isExpired && styles.textExpired]}>
          {item.storeName}
        </Text>

        {/* Expiry Info */}
        <View style={[
          styles.expiryContainer,
          isExpired ? styles.expiryContainerExpired : (daysRemaining <= 2 ? styles.expiryContainerWarning : null)
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
              <>انتهى في {formatDateAr(item.offerEndDate)}</>
            ) : daysRemaining === 0 ? (
              <>ينتهي اليوم!</>
            ) : daysRemaining === 1 ? (
              <>ينتهي غداً</>
            ) : (
              <>ينتهي بعد {daysRemaining} أيام</>
            )}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.price, isExpired && styles.textExpired]}>
            {formatCurrency(item.offer.offerPrice * item.quantity)}
          </Text>

          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, isExpired && styles.quantityButtonExpired]}
              onPress={(e) => {
                e?.stopPropagation?.();
                onUpdateQuantity(item.quantity - 1);
              }}
              disabled={isExpired}
            >
              <Ionicons name="remove" size={18} color={isExpired ? colors.gray[400] : colors.text} />
            </TouchableOpacity>

            <Text style={[styles.quantity, isExpired && styles.textExpired]}>
              {item.quantity}
            </Text>

            <TouchableOpacity
              style={[styles.quantityButton, isExpired && styles.quantityButtonExpired]}
              onPress={(e) => {
                e?.stopPropagation?.();
                onUpdateQuantity(item.quantity + 1);
              }}
              disabled={isExpired}
            >
              <Ionicons name="add" size={18} color={isExpired ? colors.gray[400] : colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  // If onPress is provided, wrap in TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {containerContent}
      </TouchableOpacity>
    );
  }

  return containerContent;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...shadows.sm,
    marginBottom: spacing.md,
    position: 'relative',
  },
  containerExpired: {
    backgroundColor: colors.gray[50],
    opacity: 0.7,
    borderWidth: 1,
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
    height: 80,
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
  },
  name: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    marginRight: I18nManager.isRTL ? 0 : spacing.sm,
    marginLeft: I18nManager.isRTL ? spacing.sm : 0,
  },
  removeButton: {
    padding: spacing.xs,
  },
  storeName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    marginBottom: spacing.xs,
  },
  expiryContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  footer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  quantityContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xs,
  },
  quantityButton: {
    padding: spacing.sm,
  },
  quantityButtonExpired: {
    opacity: 0.5,
  },
  quantity: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
});

export default BasketItemCard;