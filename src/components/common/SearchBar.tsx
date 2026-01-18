import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle, I18nManager, TextInputProps, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  editable?: boolean;
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
  large?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  style,
  editable = true,
  pointerEvents = 'auto',
  autoFocus = false,
  onSubmitEditing,
  returnKeyType = 'search',
  large = false,
}) => {
  return (
    <View style={[
      styles.container,
      large && styles.containerLarge,
      style
    ]}>
      <Ionicons
        name="search"
        size={large ? 24 : 20}
        color={colors.gray[500]}
        style={styles.icon}
      />
      <TextInput
        style={[
          styles.input,
          large && styles.inputLarge,
          I18nManager.isRTL && styles.rtlInput
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray[400]}
        textAlign={I18nManager.isRTL ? 'right' : 'left'}
        editable={editable}
        pointerEvents={pointerEvents}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        blurOnSubmit={true}
        autoCorrect={false}
        autoCapitalize="none"
        underlineColorAndroid="transparent"
        selectionColor={colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Important: Allow container to expand
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    minHeight: 44,
  },
  containerLarge: {
    height: 56,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    marginRight: I18nManager.isRTL ? 0 : spacing.sm,
    marginLeft: I18nManager.isRTL ? spacing.sm : 0,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    minHeight: 44,
    lineHeight: Platform.select({
      ios: typography.fontSize.md * 1.2,
      android: typography.fontSize.md * 1.4,
    }),
    paddingVertical: Platform.select({
      ios: 12,
      android: 8,
    }),
    paddingHorizontal: 0,
    paddingRight: I18nManager.isRTL ? 0 : spacing.xl, // Add padding for clear button
    paddingLeft: I18nManager.isRTL ? spacing.xl : 0, // Add padding for clear button
    margin: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputLarge: {
    fontSize: typography.fontSize.lg,
    minHeight: 56,
    lineHeight: Platform.select({
      ios: typography.fontSize.lg * 1.2,
      android: typography.fontSize.lg * 1.4,
    }),
    paddingVertical: Platform.select({
      ios: 16,
      android: 12,
    }),
  },
  rtlInput: {
    textAlign: 'right',
  },
});

export default SearchBar;