// src/store/slices/offersSlice.ts - WITH FORCE REFRESH SUPPORT
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { OffersState, Offer, Catalogue } from '../../types';
import { loadCataloguesFromFirestore } from '../../data/catalogueRegistry';
import { serializeFirestoreDocument } from '../../utils/firestoreHelpers';
import { cacheService, CACHE_KEYS } from '../../services/cacheService';

const initialState: OffersState = {
  offers: [],
  catalogues: [],
  loading: false,
  error: null,
};

/**
 * Async thunk to load catalogues from Firestore with cache support
 * @param forceRefresh - If true, bypasses cache and fetches fresh data
 */
export const loadCatalogues = createAsyncThunk(
  'offers/loadCatalogues',
  async (forceRefresh: boolean = false) => {
    console.log('📄 [offersSlice] Loading catalogues...', { forceRefresh });
    
    // If force refresh, invalidate cache first
    if (forceRefresh) {
      console.log('🔄 Force refresh - invalidating catalogue cache');
      await cacheService.invalidate(CACHE_KEYS.CATALOGUES);
    }
    
    const catalogues = await loadCataloguesFromFirestore();
    
    // Serialize the catalogues to convert Firestore Timestamps to ISO strings
    const serializedCatalogues = catalogues.map(catalogue => 
      serializeFirestoreDocument(catalogue)
    );
    
    console.log(`✅ [offersSlice] Loaded ${serializedCatalogues.length} catalogues`);
    return serializedCatalogues;
  }
);

export const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {
    setOffers: (state, action: PayloadAction<Offer[]>) => {
      // Serialize offers if they contain timestamps
      state.offers = action.payload.map(offer => 
        serializeFirestoreDocument(offer)
      );
      console.log(`📝 [offersSlice] Set ${action.payload.length} offers`);
    },
    
    setCatalogues: (state, action: PayloadAction<Catalogue[]>) => {
      // Serialize catalogues if they contain timestamps
      state.catalogues = action.payload.map(catalogue => 
        serializeFirestoreDocument(catalogue)
      );
      console.log(`📝 [offersSlice] Set ${action.payload.length} catalogues`);
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    hydrateOffers: (state, action: PayloadAction<OffersState>) => {
      // Serialize the hydrated data
      state.offers = action.payload.offers.map(offer => 
        serializeFirestoreDocument(offer)
      );
      state.catalogues = action.payload.catalogues.map(catalogue => 
        serializeFirestoreDocument(catalogue)
      );
      state.loading = false;
      state.error = null;
      console.log(`💧 [offersSlice] Hydrated with ${action.payload.catalogues.length} catalogues`);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCatalogues.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('⏳ [offersSlice] Loading catalogues...');
      })
      .addCase(loadCatalogues.fulfilled, (state, action) => {
        state.loading = false;
        state.catalogues = action.payload;
        console.log(`✅ [offersSlice] Catalogues loaded into Redux: ${action.payload.length}`);
      })
      .addCase(loadCatalogues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load catalogues';
        console.error('❌ [offersSlice] Failed to load catalogues:', action.error);
      });
  },
});

export const {
  setOffers,
  setCatalogues,
  setLoading,
  setError,
  hydrateOffers,
} = offersSlice.actions;

export default offersSlice.reducer;