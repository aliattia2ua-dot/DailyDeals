// src/hooks/useSafeTabBarHeight.ts
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook to get the correct bottom padding to avoid tab bar overlap
 * Use this in screens that have buttons at the bottom
 */
export const useSafeTabBarHeight = () => {
  const insets = useSafeAreaInsets();
  
  // Tab bar base height + safe area insets
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 60 : 60;
  const tabBarHeight = TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? insets.bottom : 0);
  
  return {
    tabBarHeight,
    paddingBottom: tabBarHeight + 16, // Add extra 16px padding
  };
};