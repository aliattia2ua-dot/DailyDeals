// src/app/(tabs)/_layout.tsx - WITH PERFORMANCE MONITOR
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import { useAppSelector } from '../../store/hooks';
import { useAppConfig } from '../../hooks/useAppConfig';
import { AnnouncementBar } from '../../components/common/AnnouncementBar';
import { ForceUpdateModal } from '../../components/common/ForceUpdateModal';
import { AdBanner } from '../../components/common';
import { PerformanceMonitor } from '../../components/dev/PerformanceMonitor'; // 🔥 NEW

// Badge component for basket count
const BasketBadge = () => {
  const basketItems = useAppSelector(state => state.basket.items);
  const count = basketItems.length;

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

// Custom icon with badge for basket tab
const BasketIcon = ({ color, size }: { color: string; size: number }) => (
  <View>
    <Ionicons name="cart" size={size} color={color} />
    <BasketBadge />
  </View>
);

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const { config, updateInfo } = useAppConfig();
  const [updateModalDismissed, setUpdateModalDismissed] = useState(false);
  const insets = useSafeAreaInsets();

  const MIN_BOTTOM_PADDING = 2;
  const tabBarBottomPadding = insets.bottom > 0 ? insets.bottom / 3 : MIN_BOTTOM_PADDING;

  const showUpdateModal =
    updateInfo.needsUpdate &&
    (updateInfo.forceUpdate || !updateModalDismissed);

  const appName = i18n.language === 'ar' ? 'دليل العروض' : 'Daily Deals';

  return (
    <>
      <ForceUpdateModal
        visible={showUpdateModal}
        message={updateInfo.message}
        updateUrl={config.versionControl.updateUrl}
        forceUpdate={updateInfo.forceUpdate}
      />

      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <AnnouncementBar />

        <View style={styles.persistentAdContainer}>
          <AdBanner position="tabs_persistent" />
        </View>

        {/* Navigation & Content */}
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.gray[400],
              tabBarStyle: {
                backgroundColor: colors.white,
                borderTopWidth: 1,
                borderTopColor: colors.gray[200],
                paddingBottom: tabBarBottomPadding,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '500',
                marginTop: -2,
                marginBottom: 0,
              },
              tabBarIconStyle: {
                marginTop: 0,
                marginBottom: 2,
              },
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.white,
              },
              headerTitleStyle: {
                fontWeight: 'bold',
                fontSize: 18,
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: t('navigation.home'),
                headerTitle: appName,
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="home" size={22} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="flyers"
              options={{
                title: t('navigation.flyers'),
                headerTitle: t('flyers.title'),
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="book" size={22} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="favorites"
              options={{
                title: t('navigation.favorites'),
                headerTitle: t('favorites.title'),
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="heart" size={22} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="basket"
              options={{
                title: t('navigation.basket'),
                headerTitle: t('basket.title'),
                tabBarIcon: ({ color, size }) => (
                  <BasketIcon color={color} size={22} />
                ),
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: t('navigation.settings'),
                headerTitle: t('settings.title'),
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="settings" size={22} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="stores"
              options={{
                href: null, // Hidden from tabs
              }}
            />
          </Tabs>
        </View>

        {/* Bottom Ad Space */}
        <View style={styles.bottomAdContainer}>
          <AdBanner position="tabs_bottom" maxAds={1} />
        </View>

        {/* 🔥 Performance Monitor - Only in DEV mode */}
        {__DEV__ && <PerformanceMonitor />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -10,
    top: -5,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  persistentAdContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  bottomAdContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});