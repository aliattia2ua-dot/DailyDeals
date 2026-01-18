import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { useLocalized } from '../../hooks';
import type { Category } from '../../types';

interface CategoryGridProps {
  categories: Category[];
  onCategoryPress: (category: Category) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onCategoryPress,
}) => {
  const { getName } = useLocalized();

  return (
    <View style={styles.container}>
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={styles.categoryItem}
          onPress={() => onCategoryPress(category)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={28}
              color={colors.primary}
            />
          </View>
          <Text style={styles.categoryName} numberOfLines={2}>
            {getName(category)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: typography.fontSize.xs,
    color: colors.text,
    textAlign: 'center',
  },
});

export default CategoryGrid;
