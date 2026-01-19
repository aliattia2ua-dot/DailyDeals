// src/store/middleware/syncMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { syncBasketToFirestore, syncFavoritesToFirestore } from '../../services/userDataService';
import type { RootState } from '../index';

// Debounce helper
let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Middleware to automatically sync basket and favorites to Firestore
 * when the user is authenticated
 */
export const syncMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);

  // Only sync if action affects basket or favorites (but not hydrate actions)
  const shouldSync =
    (action.type.startsWith('basket/') && action.type !== 'basket/hydrateBasket' && action.type !== 'basket/clearBasket') ||
    (action.type.startsWith('favorites/') && action.type !== 'favorites/hydrateFavorites' && action.type !== 'favorites/clearFavorites');

  if (shouldSync) {
    const state = store.getState();
    const { user, isAuthenticated } = state.auth;

    // Only sync if user is authenticated
    if (isAuthenticated && user) {
      // Debounce sync to avoid too many writes
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }

      syncTimeout = setTimeout(async () => {
        try {
          console.log('💾 [Sync] Auto-syncing data to Firestore...');

          const promises = [];

          // Sync basket if basket action
          if (action.type.startsWith('basket/')) {
            promises.push(
              syncBasketToFirestore(user.uid, state.basket.items)
                .then(() => console.log('✅ [Sync] Basket synced'))
                .catch((err) => console.error('❌ [Sync] Basket sync failed:', err))
            );
          }

          // Sync favorites if favorites action
          if (action.type.startsWith('favorites/')) {
            promises.push(
              syncFavoritesToFirestore(user.uid, state.favorites)
                .then(() => console.log('✅ [Sync] Favorites synced'))
                .catch((err) => console.error('❌ [Sync] Favorites sync failed:', err))
            );
          }

          await Promise.all(promises);
        } catch (error) {
          console.error('❌ [Sync] Error during auto-sync:', error);
        }
      }, 1000); // Wait 1 second before syncing
    }
  }

  return result;
};