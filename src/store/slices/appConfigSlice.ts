// src/store/slices/appConfigSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppConfig, DEFAULT_APP_CONFIG } from '../../types/appConfig';

interface AppConfigState {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  announcementDismissed: boolean;
}

const initialState: AppConfigState = {
  config: DEFAULT_APP_CONFIG,
  loading: true,
  error: null,
  announcementDismissed: false,
};

const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<AppConfig>) => {
      state.config = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    dismissAnnouncement: (state) => {
      state.announcementDismissed = true;
    },
    resetAnnouncementDismissal: (state) => {
      state.announcementDismissed = false;
    },
  },
});

export const {
  setConfig,
  setLoading,
  setError,
  dismissAnnouncement,
  resetAnnouncementDismissal,
} = appConfigSlice.actions;

export default appConfigSlice.reducer;
