// src/hooks/useSmartRefresh.ts
import { useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

interface UseSmartRefreshOptions {
  /**
   * Function to call when refresh is triggered
   */
  onRefresh: () => void | Promise<void>;
  
  /**
   * Cooldown period in milliseconds before allowing another refresh
   * @default 5 * 60 * 1000 (5 minutes)
   */
  cooldownMs?: number;
  
  /**
   * Whether to log refresh actions
   * @default true
   */
  enableLogging?: boolean;
  
  /**
   * Name of the screen for logging purposes
   * @default 'Screen'
   */
  screenName?: string;
}

/**
 * Hook for implementing smart refresh behavior with cooldown
 * Prevents aggressive refreshing on every screen focus
 * 
 * @example
 * ```tsx
 * useSmartRefresh({
 *   onRefresh: () => loadData(false),
 *   cooldownMs: 5 * 60 * 1000, // 5 minutes
 *   screenName: 'Home'
 * });
 * ```
 */
export function useSmartRefresh({
  onRefresh,
  cooldownMs = 5 * 60 * 1000,
  enableLogging = true,
  screenName = 'Screen',
}: UseSmartRefreshOptions) {
  const lastRefreshRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const shouldRefresh = !lastRefreshRef.current || timeSinceLastRefresh > cooldownMs;

      if (shouldRefresh) {
        if (enableLogging) {
          console.log(
            `🔄 [${screenName}] Screen focused - refreshing data (cooldown passed: ${(timeSinceLastRefresh / 1000).toFixed(0)}s)`
          );
        }
        onRefresh();
        lastRefreshRef.current = now;
      } else {
        if (enableLogging) {
          const remainingCooldown = cooldownMs - timeSinceLastRefresh;
          console.log(
            `⏸️ [${screenName}] Screen focused - using cached data (cooldown remaining: ${(remainingCooldown / 1000).toFixed(0)}s)`
          );
        }
      }
    }, [onRefresh, cooldownMs, enableLogging, screenName])
  );

  /**
   * Force an immediate refresh, bypassing the cooldown
   */
  const forceRefresh = useCallback(() => {
    if (enableLogging) {
      console.log(`🔄 [${screenName}] Force refresh triggered`);
    }
    onRefresh();
    lastRefreshRef.current = Date.now();
  }, [onRefresh, enableLogging, screenName]);

  /**
   * Reset the cooldown timer
   */
  const resetCooldown = useCallback(() => {
    lastRefreshRef.current = 0;
    if (enableLogging) {
      console.log(`🔄 [${screenName}] Cooldown reset`);
    }
  }, [enableLogging, screenName]);

  return {
    forceRefresh,
    resetCooldown,
    lastRefreshTime: lastRefreshRef.current,
  };
}
