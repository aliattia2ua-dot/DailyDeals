// src/components/home/FeaturedOffers.tsx - WITH UNIFORM PRICE LAYOUT
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { formatCurrency, calculateDiscount } from '../../utils/helpers';
import type { OfferWithCatalogue } from '../../services/offerService';

interface FeaturedOffersProps {
  offers: OfferWithCatalogue[];
  onOfferPress: (offer: OfferWithCatalogue) => void;
  onAddToBasket: (offer: OfferWithCatalogue) => void;
  favoriteSubcategoryIds?: string[];
  onToggleFavorite?: (subcategoryId: string) => void;
}

export const FeaturedOffers: React.FC<FeaturedOffersProps> = ({
  offers,
  onOfferPress,
  onAddToBasket,
  favoriteSubcategoryIds = [],
  onToggleFavorite,
}) => {
  const renderItem = ({ item }: { item: OfferWithCatalogue }) => {
    const discount = item.originalPrice
      ? calculateDiscount(item.originalPrice, item.offerPrice)
      : 0;

    const isFavorite = favoriteSubcategoryIds.includes(item.categoryId);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onOfferPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}%</Text>
            </View>
          )}

          {onToggleFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => onToggleFavorite(item.categoryId)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? colors.primary : colors.white}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {/* ✅ Name and Add Button Row */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={2}>{item.nameAr}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => onAddToBasket(item)}
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* ✅ FIXED: Uniform price layout with fixed height */}
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.offerPrice}>{formatCurrency(item.offerPrice)}</Text>
              {item.originalPrice && (
                <Text style={styles.originalPrice}>{formatCurrency(item.originalPrice)}</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={offers}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      inverted={I18nManager.isRTL}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: spacing.md,
  },
  card: {
    width: 160,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
    marginRight: I18nManager.isRTL ? 0 : spacing.md,
    marginLeft: I18nManager.isRTL ? spacing.md : 0,
  },
  imageContainer: {
    position: 'relative',
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: I18nManager.isRTL ? undefined : spacing.xs,
    right: I18nManager.isRTL ? spacing.xs : undefined,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: I18nManager.isRTL ? undefined : spacing.xs,
    left: I18nManager.isRTL ? spacing.xs : undefined,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    padding: spacing.xs,
    paddingTop: spacing.sm,
    minHeight: 75, // ✅ Reduced from 90 for more compact look
  },
  nameRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    marginBottom: 2, // ✅ Further reduced for minimal gap
    gap: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: typography.fontSize.md, // ✅ Increased from sm for better readability
    fontWeight: '600',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    lineHeight: 17, // ✅ Adjusted to match larger font
  },
  // ✅ NEW: Price row with fixed height for alignment
  priceRow: {
    height: 32, // ✅ Reduced from 40 for more compact layout
    justifyContent: 'flex-end', // Pushes prices to bottom
  },
  priceContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  offerPrice: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});