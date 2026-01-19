// src/store/slices/favoritesSlice.ts - UPDATED FOR SUBCATEGORIES
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FavoritesState } from '../../types';

// UPDATED: Changed from offerIds to subcategoryIds
interface UpdatedFavoritesState {
  subcategoryIds: string[]; // Changed from offerIds
  storeIds: string[];
}

const initialState: UpdatedFavoritesState = {
  subcategoryIds: [],
  storeIds: [],
};

export const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    // NEW: Toggle favorite subcategory (replaces toggleFavoriteOffer)
    toggleFavoriteSubcategory: (state, action: PayloadAction<string>) => {
      const subcategoryId = action.payload;
      const index = state.subcategoryIds.indexOf(subcategoryId);

      if (index > -1) {
        state.subcategoryIds.splice(index, 1);
        console.log(`❤️ Removed subcategory ${subcategoryId} from favorites`);
      } else {
        state.subcategoryIds.push(subcategoryId);
        console.log(`❤️ Added subcategory ${subcategoryId} to favorites`);
      }
    },

    toggleFavoriteStore: (state, action: PayloadAction<string>) => {
      const storeId = action.payload;
      const index = state.storeIds.indexOf(storeId);

      if (index > -1) {
        state.storeIds.splice(index, 1);
        console.log(`⭐ Removed store ${storeId} from favorites`);
      } else {
        state.storeIds.push(storeId);
        console.log(`⭐ Added store ${storeId} to favorites`);
      }
    },

    hydrateFavorites: (state, action: PayloadAction<UpdatedFavoritesState>) => {
      state.subcategoryIds = action.payload.subcategoryIds || [];
      state.storeIds = action.payload.storeIds || [];
      console.log(`💧 Hydrated favorites: ${state.subcategoryIds.length} subcategories, ${state.storeIds.length} stores`);
    },

    clearFavorites: (state) => {
      console.log('🗑️ Clearing favorites');
      state.subcategoryIds = [];
      state.storeIds = [];
    },
  },
});

export const {
  toggleFavoriteSubcategory,
  toggleFavoriteStore,
  hydrateFavorites,
  clearFavorites
} = favoritesSlice.actions;

export default favoritesSlice.reducer;