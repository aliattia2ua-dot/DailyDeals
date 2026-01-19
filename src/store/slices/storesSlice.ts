import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { StoresState, Store } from '../../types';

const initialState: StoresState = {
  stores: [],
  selectedStoreId: null,
  loading: false,
  error: null,
};

export const storesSlice = createSlice({
  name: 'stores',
  initialState,
  reducers: {
    setStores: (state, action: PayloadAction<Store[]>) => {
      state.stores = action.payload;
    },
    
    selectStore: (state, action: PayloadAction<string | null>) => {
      state.selectedStoreId = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    hydrateStores: (state, action: PayloadAction<StoresState>) => {
      state.stores = action.payload.stores;
      state.selectedStoreId = action.payload.selectedStoreId;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setStores,
  selectStore,
  setLoading,
  setError,
  hydrateStores,
} = storesSlice.actions;

export default storesSlice.reducer;
