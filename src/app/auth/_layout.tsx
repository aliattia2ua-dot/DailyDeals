// src/app/auth/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
