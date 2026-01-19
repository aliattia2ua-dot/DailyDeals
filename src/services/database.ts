import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import type { BasketState, FavoritesState, SettingsState } from '../types';

// Generic database service for AsyncStorage abstraction
class DatabaseService {
  // Generic CRUD operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  // Basket operations
  async getBasket(): Promise<BasketState | null> {
    return this.get<BasketState>(STORAGE_KEYS.BASKET);
  }

  async saveBasket(basket: BasketState): Promise<boolean> {
    return this.set(STORAGE_KEYS.BASKET, basket);
  }

  // Favorites operations
  async getFavorites(): Promise<FavoritesState | null> {
    return this.get<FavoritesState>(STORAGE_KEYS.FAVORITES);
  }

  async saveFavorites(favorites: FavoritesState): Promise<boolean> {
    return this.set(STORAGE_KEYS.FAVORITES, favorites);
  }

  // Settings operations
  async getSettings(): Promise<SettingsState | null> {
    return this.get<SettingsState>(STORAGE_KEYS.SETTINGS);
  }

  async saveSettings(settings: SettingsState): Promise<boolean> {
    return this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // Language operations
  async getLanguage(): Promise<'ar' | 'en' | null> {
    return this.get<'ar' | 'en'>(STORAGE_KEYS.LANGUAGE);
  }

  async saveLanguage(language: 'ar' | 'en'): Promise<boolean> {
    return this.set(STORAGE_KEYS.LANGUAGE, language);
  }

  // Sync queue for future cloud sync implementation
  private syncQueue: Array<{ action: string; data: unknown; timestamp: number }> = [];

  addToSyncQueue(action: string, data: unknown): void {
    this.syncQueue.push({
      action,
      data,
      timestamp: Date.now(),
    });
  }

  getSyncQueue() {
    return [...this.syncQueue];
  }

  clearSyncQueue(): void {
    this.syncQueue = [];
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
