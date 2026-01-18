import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'medium',
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.white,
          ...shadows.sm,
        };
      case 'outlined':
        return {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.gray[200],
        };
      case 'filled':
        return {
          backgroundColor: colors.backgroundSecondary,
        };
      default:
        return {};
    }
  };

  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: spacing.sm };
      case 'medium':
        return { padding: spacing.md };
      case 'large':
        return { padding: spacing.lg };
      default:
        return {};
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), getPaddingStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

export default Card;
