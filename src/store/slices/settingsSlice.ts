// src/store/slices/settingsSlice.ts - FIXED WITH FIRESTORE PRIORITY
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { syncLocationToFirestore } from '../../services/userDataService';
import type { SettingsState } from '../../types';
import type { RootState } from '../index';

interface LocationPayload {
  governorate: string | null;
  city?:  string | null;
  phoneNumber?: string | null;
}

interface SettingsStateWithMeta extends SettingsState {
  // Track if location was loaded from Firestore (takes priority over local)
  firestoreLocationLoaded: boolean;
}

const initialState: SettingsStateWithMeta = {
  language: 'ar',
  notificationsEnabled: true,
  isRTL: true,
  userGovernorate: null,
  userCity: null,
  firestoreLocationLoaded: false,
};

// ============================================
// ASYNC THUNK TO SYNC LOCATION TO FIRESTORE
// ============================================

/**
 * Sync user location to Firestore (if logged in)
 */
export const syncLocation = createAsyncThunk(
  'settings/syncLocation',
  async (payload: LocationPayload, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const user = state.auth.user;

      // Only sync if user is logged in
      if (user) {
        console.log('📍 [settingsSlice] Syncing location to Firestore:', payload);
        await syncLocationToFirestore(
          user.uid,
          payload.governorate,
          payload.city || null,
          payload.phoneNumber
        );
        console.log('✅ [settingsSlice] Location synced successfully');
      } else {
        console.log('ℹ️ [settingsSlice] User not logged in, skipping Firestore sync');
      }

      return payload;
    } catch (error:  any) {
      console.error('❌ [settingsSlice] Failed to sync location:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<'ar' | 'en'>) => {
      state.language = action.payload;
      state.isRTL = action.payload === 'ar';
    },

    toggleNotifications: (state) => {
      state. notificationsEnabled = !state.notificationsEnabled;
    },

    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },

    /**
     * Set user location (from user interaction)
     * This is called when user manually selects a location
     */
    setUserLocation: (state, action: PayloadAction<LocationPayload>) => {
      state.userGovernorate = action.payload. governorate;
      state.userCity = action.payload.city ??  null;
      console.log('📍 [settingsSlice] Redux:  Location updated by user:', action.payload);
    },

    /**
     * Clear user location
     */
    clearUserLocation: (state) => {
      state.userGovernorate = null;
      state.userCity = null;
      console.log('📍 [settingsSlice] Redux:  Location cleared');
    },

    /**
     * Hydrate location from Firestore on login
     * This ALWAYS takes priority and sets the flag
     */
    hydrateLocation:  (state, action:  PayloadAction<LocationPayload>) => {
      state.userGovernorate = action.payload.governorate;
      state. userCity = action. payload.city ?? null;
      state. firestoreLocationLoaded = true; // Mark that Firestore data was loaded
      console. log('📍 [settingsSlice] Redux: Location hydrated from Firestore:', action.payload);
    },

    /**
     * Hydrate all settings from local storage
     * Location will ONLY be restored if Firestore data hasn't been loaded yet
     */
    hydrateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      console.log('🔧 [settingsSlice] hydrateSettings called with:', action.payload);
      console.log('🔧 [settingsSlice] firestoreLocationLoaded:', state.firestoreLocationLoaded);

      // Always hydrate language and notification settings
      if (action.payload. language !== undefined) {
        state.language = action.payload.language;
        state.isRTL = action.payload.language === 'ar';
      }
      if (action.payload. notificationsEnabled !== undefined) {
        state.notificationsEnabled = action.payload.notificationsEnabled;
      }

      // ONLY hydrate location if Firestore data hasn't been loaded
      // This prevents local storage from overwriting Firestore data
      if (!state.firestoreLocationLoaded) {
        if (action.payload. userGovernorate !== undefined) {
          state.userGovernorate = action.payload. userGovernorate ??  null;
        }
        if (action.payload.userCity !== undefined) {
          state.userCity = action.payload. userCity ?? null;
        }
        console.log('📍 [settingsSlice] Location restored from local storage:', {
          governorate: state.userGovernorate,
          city:  state.userCity
        });
      } else {
        console.log('📍 [settingsSlice] Skipping local location - Firestore data already loaded');
      }
    },

    /**
     * Reset the Firestore loaded flag (call on sign out)
     */
    resetFirestoreLocationFlag: (state) => {
      state. firestoreLocationLoaded = false;
      console.log('🔄 [settingsSlice] Firestore location flag reset');
    },
  },
  extraReducers: (builder) => {
    builder
      . addCase(syncLocation.pending, (state) => {
        console.log('⏳ [settingsSlice] Syncing location to Firestore.. .');
      })
      .addCase(syncLocation.fulfilled, (state, action) => {
        // Update local state after successful sync
        if (action.payload) {
          state.userGovernorate = action.payload.governorate;
          state. userCity = action. payload.city ?? null;
        }
        console. log('✅ [settingsSlice] Location sync completed');
      })
      .addCase(syncLocation.rejected, (state, action) => {
        console. error('❌ [settingsSlice] Location sync failed:', action. payload);
      });
  },
});

export const {
  setLanguage,
  toggleNotifications,
  setNotificationsEnabled,
  setUserLocation,
  clearUserLocation,
  hydrateLocation,
  hydrateSettings,
  resetFirestoreLocationFlag,
} = settingsSlice.actions;

export default settingsSlice.reducer;