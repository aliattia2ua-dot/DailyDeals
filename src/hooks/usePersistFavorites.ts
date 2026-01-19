// src/hooks/usePersistFavorites.ts - UPDATED for subcategories
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { hydrateFavorites } from '../store/slices/favoritesSlice';

const FAVORITES_STORAGE_KEY = '@favorites';

export const usePersistFavorites = () => {
  const dispatch = useAppDispatch();
  const favorites = useAppSelector(state => state.favorites);

  // Load favorites from storage on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (storedFavorites) {
          const parsed = JSON.parse(storedFavorites);
          
          // UPDATED: Handle migration from old offerIds to new subcategoryIds
          const favoritesData = {
            subcategoryIds: parsed.subcategoryIds || parsed.offerIds || [],
            storeIds: parsed.storeIds || [],
            catalogueIds: parsed.catalogueIds || [],
          };
          
          dispatch(hydrateFavorites(favoritesData));
          console.log('💾 Loaded favorites from storage:', favoritesData);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    loadFavorites();
  }, [dispatch]);

  // Save favorites to storage whenever they change
  useEffect(() => {
    const saveFavorites = async () => {
      try {
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
        console.log('💾 Saved favorites to storage:', favorites);
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
    };

    // Only save if we have data (avoid saving empty initial state)
    if (favorites.subcategoryIds.length > 0 || favorites.storeIds.length > 0) {
      saveFavorites();
    }
  }, [favorites]);

  return null;
};
