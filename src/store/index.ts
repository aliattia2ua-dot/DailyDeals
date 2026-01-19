// src/store/index.ts - WITH APP CONFIG
import { configureStore } from '@reduxjs/toolkit';
import basketReducer from './slices/basketSlice';
import favoritesReducer from './slices/favoritesSlice';
import offersReducer from './slices/offersSlice';
import storesReducer from './slices/storesSlice';
import settingsReducer from './slices/settingsSlice';
import authReducer from './slices/authSlice';
import appConfigReducer from './slices/appConfigSlice'; // 🆕 ADD THIS
import { syncMiddleware } from './middleware/syncMiddleware';

export const store = configureStore({
  reducer: {
    basket: basketReducer,
    favorites: favoritesReducer,
    offers: offersReducer,
    stores: storesReducer,
    settings: settingsReducer,
    auth: authReducer,
    appConfig: appConfigReducer, // 🆕 ADD THIS
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'basket/hydrateBasket',
          'favorites/hydrateFavorites',
          'auth/signInWithGoogle/fulfilled',
          'auth/checkAuthState/fulfilled',
          'auth/setUser',
          'appConfig/setConfig', // 🆕 ADD THIS
        ],
        ignoredPaths: [
          'auth.user.createdAt',
          'auth.user.lastLoginAt',
        ],
      },
    }).concat(syncMiddleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;