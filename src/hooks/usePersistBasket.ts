// src/hooks/usePersistBasket.ts - NEW FILE WITH IMAGE PREFETCHING
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { hydrateBasket, removeExpiredItems } from '../store/slices/basketSlice';
import { databaseService } from '../services/database';
import { imageCacheService } from '../services/imageCacheService';

/**
 * Hook to persist basket state and prefetch basket images
 * ✅ Only caches images for items actually in basket
 */
export const usePersistBasket = () => {
  const dispatch = useAppDispatch();
  const basket = useAppSelector(state => state.basket);

  // ✅ Load basket on mount
  useEffect(() => {
    const loadBasket = async () => {
      const savedBasket = await databaseService.getBasket();
      if (savedBasket) {
        dispatch(hydrateBasket(savedBasket));
        
        // Remove expired items
        dispatch(removeExpiredItems());
        
        console.log('💧 Basket hydrated from storage');
      }
    };

    loadBasket();
  }, [dispatch]);

  // ✅ Save basket whenever it changes
  useEffect(() => {
    const saveBasket = async () => {
      await databaseService.saveBasket(basket);
      console.log(`💾 Basket saved (${basket.items.length} items)`);
    };

    saveBasket();
  }, [basket]);

  // ✅ Prefetch basket item images with HIGH priority
  useEffect(() => {
    const prefetchImages = async () => {
      const imageUrls: string[] = [];

      for (const item of basket.items) {
        if (item.type === 'offer' && item.offer?.imageUrl) {
          imageUrls.push(item.offer.imageUrl);
        }
        // For pages, cache the page image if available
        if (item.type === 'page' && item.cataloguePage?.imageUrl) {
          imageUrls.push(item.cataloguePage.imageUrl);
        }
      }

      if (imageUrls.length > 0) {
        console.log(`🔥 Prefetching ${imageUrls.length} basket images...`);
        await imageCacheService.prefetchBasketImages(imageUrls);
      }
    };

    if (basket.items.length > 0) {
      prefetchImages();
    }
  }, [basket.items]);
};
