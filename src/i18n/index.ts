import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import ar from './ar';
import en from './en';

import { STORAGE_KEYS, APP_CONFIG } from '../constants/config';

const resources = {
  ar: { translation: ar },
  en: { translation: en },
};

// Get stored language or detect device language
const getStoredLanguage = async (): Promise<'ar' | 'en'> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (storedLanguage === 'ar' || storedLanguage === 'en') {
      return storedLanguage;
    }
  } catch (error) {
    console.log('Error getting stored language:', error);
  }
  
  // Default to Arabic as per requirements
  return APP_CONFIG.defaultLanguage;
};

// Initialize i18n
export const initI18n = async () => {
  const language = await getStoredLanguage();
  
  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
  
  // Set RTL based on language
  const isRTL = language === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
  
  return language;
};

// Change language function
export const changeLanguage = async (language: 'ar' | 'en') => {
  await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  await i18n.changeLanguage(language);
  
  // Set RTL based on language
  const isRTL = language === 'ar';
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
};

export default i18n;
