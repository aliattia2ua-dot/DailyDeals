// src/store/slices/basketSlice.ts - COMPLETE WITH REMOVE EXPIRED
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { BasketState, BasketItem, Offer, Catalogue, CataloguePage } from '../../types';
import { normalizeDateString, isDateExpired } from '../../utils/dateUtils';

const initialState: BasketState = {
  items: [],
  total: 0,
};

interface AddOfferPayload {
  offer: Offer & {
    catalogueStartDate?: string;
    catalogueEndDate?: string;
    catalogueId?: string;
    catalogueTitle?: string;
  };
  storeName: string;
}

interface AddPagePayload {
  catalogue: Catalogue;
  page: CataloguePage;
  storeName: string;
  offers: Offer[];
}

export const basketSlice = createSlice({
  name: 'basket',
  initialState,
  reducers: {
    addToBasket: (state, action: PayloadAction<AddOfferPayload>) => {
      const { offer, storeName } = action.payload;

      // Log what we received
      console.log('🛒 [basketSlice] Adding offer to basket:', {
        offerId: offer.id,
        offerName: offer.nameAr,
        hasEndDate: !!offer.endDate,
        hasCatalogueEndDate: !!(offer as any).catalogueEndDate,
        endDate: offer.endDate,
        catalogueEndDate: (offer as any).catalogueEndDate,
      });

      const existingItem = state.items.find(
        item => item.type === 'offer' && item.offer?.id === offer.id
      );

      if (existingItem && existingItem.type === 'offer') {
        existingItem.quantity += 1;
        console.log(`🔄 [basketSlice] Updated quantity for ${offer.nameAr}: ${existingItem.quantity}`);
      } else {
        // Extract dates - try catalogue dates first, then fall back to offer dates
        let endDate = (offer as any).catalogueEndDate || offer.endDate;
        let startDate = (offer as any).catalogueStartDate || offer.startDate;

        // Normalize the dates
        if (endDate) endDate = normalizeDateString(endDate);
        if (startDate) startDate = normalizeDateString(startDate);

        console.log(`✅ [basketSlice] Creating basket item with dates:`, {
          startDate,
          endDate,
          source: (offer as any).catalogueEndDate ? 'catalogue' : 'offer',
        });

        const newItem: BasketItem = {
          id: `offer-${offer.id}-${Date.now()}`,
          type: 'offer',
          offer,
          quantity: 1,
          storeName,
          offerEndDate: endDate,
          offerStartDate: startDate,
          addedAt: new Date().toISOString(),
        };
        state.items.push(newItem);
      }

      // Recalculate total
      state.total = state.items.reduce((sum, item) => {
        if (item.type === 'offer' && item.offer) {
          return sum + (item.offer.offerPrice * item.quantity);
        }
        return sum;
      }, 0);
    },

    addPageToBasket: (state, action: PayloadAction<AddPagePayload>) => {
      const { catalogue, page, storeName, offers } = action.payload;

      // Check if page already exists
      const existingItem = state.items.find(
        item => item.type === 'page' &&
               item.cataloguePage?.catalogueId === catalogue.id &&
               item.cataloguePage?.pageNumber === page.pageNumber
      );

      if (existingItem) {
        console.log('⚠️ [basketSlice] Page already in basket');
        return;
      }

      // Normalize catalogue dates
      const endDate = normalizeDateString(catalogue.endDate);
      const startDate = normalizeDateString(catalogue.startDate);

      console.log(`📄 [basketSlice] Adding page to basket:`, {
        catalogueId: catalogue.id,
        pageNumber: page.pageNumber,
        startDate,
        endDate,
      });

      const newItem: BasketItem = {
        id: `page-${catalogue.id}-${page.pageNumber}-${Date.now()}`,
        type: 'page',
        cataloguePage: {
          ...page,
          catalogueId: catalogue.id,
          catalogueTitle: catalogue.titleAr,
          offers: offers.map(o => o.id),
        },
        quantity: 1,
        storeName,
        offerEndDate: endDate,
        offerStartDate: startDate,
        addedAt: new Date().toISOString(),
      };

      state.items.push(newItem);
    },

    updateBasketItemQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(i => i.id === id);

      if (item && item.type === 'offer') {
        if (quantity <= 0) {
          state.items = state.items.filter(i => i.id !== id);
          console.log(`🗑️ [basketSlice] Removed item ${id} (quantity 0)`);
        } else {
          item.quantity = quantity;
          console.log(`🔄 [basketSlice] Updated quantity for ${id}: ${quantity}`);
        }

        // Recalculate total
        state.total = state.items.reduce((sum, item) => {
          if (item.type === 'offer' && item.offer) {
            return sum + (item.offer.offerPrice * item.quantity);
          }
          return sum;
        }, 0);
      }
    },

    removeFromBasket: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      state.items = state.items.filter(item => item.id !== itemId);
      console.log(`🗑️ [basketSlice] Removed item ${itemId}`);

      // Recalculate total
      state.total = state.items.reduce((sum, item) => {
        if (item.type === 'offer' && item.offer) {
          return sum + (item.offer.offerPrice * item.quantity);
        }
        return sum;
      }, 0);
    },

    removeExpiredItems: (state) => {
      const beforeCount = state.items.length;

      // Filter out items where offerEndDate is expired
      state.items = state.items.filter(item => {
        if (!item.offerEndDate) return true; // Keep items without expiry date
        const expired = isDateExpired(item.offerEndDate);

        if (expired) {
          console.log(`🗑️ [basketSlice] Removing expired item: ${item.id}`);
        }

        return !expired;
      });

      const afterCount = state.items.length;
      const removedCount = beforeCount - afterCount;

      // Recalculate total
      state.total = state.items.reduce((sum, item) => {
        if (item.type === 'offer' && item.offer) {
          return sum + item.offer.offerPrice * item.quantity;
        }
        return sum;
      }, 0);

      console.log(`🗑️ [basketSlice] Removed ${removedCount} expired items from basket (${beforeCount} → ${afterCount})`);
    },

    clearBasket: (state) => {
      console.log('🗑️ [basketSlice] Clearing basket');
      state.items = [];
      state.total = 0;
    },

    hydrateBasket: (state, action: PayloadAction<BasketState>) => {
      state.items = action.payload.items;
      state.total = action.payload.total;
      console.log(`💧 [basketSlice] Hydrated basket with ${state.items.length} items`);
    },
  },
});

export const {
  addToBasket,
  addPageToBasket,
  updateBasketItemQuantity,
  removeFromBasket,
  removeExpiredItems,
  clearBasket,
  hydrateBasket,
} = basketSlice.actions;

export default basketSlice.reducer;