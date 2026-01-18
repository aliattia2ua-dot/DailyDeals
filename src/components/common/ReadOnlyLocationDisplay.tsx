// components/common/ReadOnlyLocationDisplay.tsx
// ✅ Display-only location component (no ability to change)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { useAppSelector } from '../../store/hooks';
import {
  getGovernorateName,
  type GovernorateId,
} from '../../data/stores';

interface ReadOnlyLocationDisplayProps {
  showNavigateButton?: boolean; // Show "Change" button that navigates to settings
  compact?: boolean; // Use compact style like CompactLocationSelector
}

export const ReadOnlyLocationDisplay: React.FC<ReadOnlyLocationDisplayProps> = ({
  showNavigateButton = true,
  compact = true,
}) => {
  const router = useRouter();
  const userGovernorate = useAppSelector(state => state.settings.userGovernorate) as GovernorateId | null;

  const getDisplayText = () => {
    if (!userGovernorate) return 'كل المحافظات';
    return getGovernorateName(userGovernorate);
  };

  const handleNavigateToSettings = () => {
    router.push('/settings?tab=location');
  };

  if (compact) {
    // Compact style (like CompactLocationSelector but read-only)
    return (
      <View style={styles.compactContainer}>
        <Ionicons 
          name="location" 
          size={18} 
          color={userGovernorate ? colors.primary : colors.textSecondary} 
        />
        <Text 
          style={[
            styles.compactText,
            userGovernorate && styles.compactTextActive
          ]}
          numberOfLines={1}
        >
          {getDisplayText()}
        </Text>
        {showNavigateButton && (
          <TouchableOpacity 
            onPress={handleNavigateToSettings}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="settings-outline" 
              size={16} 
              color={colors.gray[400]} 
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Full style (like LocationSelector but read-only)
  return (
    <View style={styles.fullContainer}>
      <View style={styles.locationDisplay}>
        <Ionicons name="location" size={20} color={colors.primary} />
        <Text style={styles.locationText}>{getDisplayText()}</Text>
        {showNavigateButton && (
          <TouchableOpacity 
            style={styles.changeButton}
            onPress={handleNavigateToSettings}
          >
            <Text style={styles.changeButtonText}>تغيير</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showNavigateButton && (
        <Text style={styles.hintText}>
          يمكنك تغيير الموقع من صفحة الإعدادات
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact style (for flyers screen)
  compactContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.xs,
    minWidth: 140,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  compactTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Full style
  fullContainer: {
    gap: spacing.xs,
  },
  locationDisplay: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: '500',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  changeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.md,
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  hintText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    paddingHorizontal: spacing.xs,
  },
});

export default ReadOnlyLocationDisplay;