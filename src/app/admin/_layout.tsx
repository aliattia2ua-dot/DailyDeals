// src/app/admin/_layout.tsx - PRODUCTION READY
import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { useAppSelector } from '../../store/hooks';

export default function AdminLayout() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAppSelector((state) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      // Small delay to ensure auth state is settled
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsInitialized(true);
      console.log('[Admin] Initialization complete');
    };

    initialize();
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    if (!isInitialized || authLoading) {
      console.log('[Admin] Still loading...');
      return;
    }

    console.log('[Admin] Auth check:', {
      isAuthenticated,
      isAdmin
    });

    // Redirect if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
      console.log('[Admin] Access denied - redirecting to settings');
      router.replace('/(tabs)/settings');
    }
  }, [isInitialized, authLoading, isAuthenticated, isAdmin]);

  // Show loading while checking auth
  if (!isInitialized || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  // If not admin, show error (shouldn't reach here due to redirect)
  if (!isAuthenticated || !isAdmin) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>🚫 غير مصرح بالوصول</Text>
        <Text style={styles.errorSubtext}>يجب أن تكون مسؤولاً للوصول إلى هذه الصفحة</Text>
      </View>
    );
  }

  // User is admin - show admin dashboard
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'لوحة التحكم الإدارية',
          headerBackTitle: 'عودة',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});