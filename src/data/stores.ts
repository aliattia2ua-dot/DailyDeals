// data/stores.ts - FIXED VERSION with Proper Logos
import type { Store, Branch } from '../types';
import { storeLogos } from '../assets/logoRegistry';

// ============================================
// GOVERNORATE DEFINITIONS
// ============================================
export const GOVERNORATES = {
  SHARKIA: 'sharkia',
  DAKAHLIA: 'dakahlia',
  CAIRO: 'cairo',
  GIZA: 'giza',
  ALEXANDRIA: 'alexandria',
} as const;

export type GovernorateId = typeof GOVERNORATES[keyof typeof GOVERNORATES];

export const governorateNames: Record<GovernorateId, { ar: string; en: string }> = {
  sharkia: { ar: 'الشرقية', en: 'Sharkia' },
  dakahlia: { ar: 'الدقهلية', en: 'Dakahlia' },
  cairo: { ar: 'القاهرة', en: 'Cairo' },
  giza: { ar: 'الجيزة', en: 'Giza' },
  alexandria: { ar: 'الإسكندرية', en: 'Alexandria' },
};

// ============================================
// CITY DEFINITIONS
// ============================================
export const CITIES = {
  ZAGAZIG: 'zagazig',
  BILBEIS: 'bilbeis',
  MINYA_QAMH: 'minya_qamh',
  FAKUS: 'fakus',
  ABU_HAMMAD: 'abu_hammad',
  ABU_KABIR: 'abu_kabir',
  HEHIA: 'hehia',
  MANSOURA: 'mansoura',
  TALKHA: 'talkha',
  MIT_GHAMR: 'mit_ghamr',
  BELQAS: 'belqas',
  SHERBIN: 'sherbin',
  NASR_CITY: 'nasr_city',
  HELIOPOLIS: 'heliopolis',
  MAADI: 'maadi',
  DOWNTOWN: 'downtown',
  SIXTH_OCTOBER: 'sixth_october',
} as const;

export type CityId = typeof CITIES[keyof typeof CITIES];

export const cityNames: Record<CityId, { ar: string; en: string; governorate: GovernorateId }> = {
  zagazig: { ar: 'الزقازيق', en: 'Zagazig', governorate: 'sharkia' },
  bilbeis: { ar: 'بلبيس', en: 'Bilbeis', governorate: 'sharkia' },
  minya_qamh: { ar: 'منيا القمح', en: 'Minya El Qamh', governorate: 'sharkia' },
  fakus: { ar: 'فاقوس', en: 'Fakus', governorate: 'sharkia' },
  abu_hammad: { ar: 'أبو حماد', en: 'Abu Hammad', governorate: 'sharkia' },
  abu_kabir: { ar: 'أبو كبير', en: 'Abu Kabir', governorate: 'sharkia' },
  hehia: { ar: 'ههيا', en: 'Hehia', governorate: 'sharkia' },
  mansoura: { ar: 'المنصورة', en: 'Mansoura', governorate: 'dakahlia' },
  talkha: { ar: 'طلخا', en: 'Talkha', governorate: 'dakahlia' },
  mit_ghamr: { ar: 'ميت غمر', en: 'Mit Ghamr', governorate: 'dakahlia' },
  belqas: { ar: 'بلقاس', en: 'Belqas', governorate: 'dakahlia' },
  sherbin: { ar: 'شربين', en: 'Sherbin', governorate: 'dakahlia' },
  nasr_city: { ar: 'مدينة نصر', en: 'Nasr City', governorate: 'cairo' },
  heliopolis: { ar: 'مصر الجديدة', en: 'Heliopolis', governorate: 'cairo' },
  maadi: { ar: 'المعادي', en: 'Maadi', governorate: 'cairo' },
  downtown: { ar: 'وسط البلد', en: 'Downtown', governorate: 'cairo' },
  sixth_october: { ar: 'السادس من أكتوبر', en: '6th of October', governorate: 'cairo' },
};

// ============================================
// LOCAL STORE NAMES BY GOVERNORATE
// ============================================
export interface LocalStoreName {
  id: string;
  nameAr: string;
  nameEn: string;
  governorate: GovernorateId;
  cities?: CityId[];
}

export const localStoreNames: Record<GovernorateId, LocalStoreName[]> = {
  sharkia: [
    {
      id: 'zahran',
      nameAr: 'زهران',
      nameEn: 'Zahran',
      governorate: 'sharkia',
      cities: ['zagazig'],
    },
    {
      id: 'raya',
      nameAr: 'راية',
      nameEn: 'Raya',
      governorate: 'sharkia',
      cities: ['zagazig'],
    },
    {
      id: 'abouelsaoud',
      nameAr: 'أبو السعود',
      nameEn: 'Abou El Saoud',
      governorate: 'sharkia',
      cities: ['zagazig'],
    },
    {
      id: 'elmohandes',
      nameAr: 'المهندس',
      nameEn: 'El Mohandes',
      governorate: 'sharkia',
      cities: ['zagazig', 'bilbeis'],
    },
    {
      id: 'alnour',
      nameAr: 'النور',
      nameEn: 'Al Nour',
      governorate: 'sharkia',
      cities: ['zagazig', 'fakus'],
    },
  ],
  dakahlia: [
    {
      id: 'mansoura_local_1',
      nameAr: 'سوبر ماركت المنصورة',
      nameEn: 'Mansoura Supermarket',
      governorate: 'dakahlia',
      cities: ['mansoura'],
    },
    {
      id: 'talkha_local_1',
      nameAr: 'متجر طلخا المركزي',
      nameEn: 'Talkha Central Store',
      governorate: 'dakahlia',
      cities: ['talkha'],
    },
  ],
  cairo: [
    {
      id: 'cairo_local_1',
      nameAr: 'سوبر ماركت القاهرة',
      nameEn: 'Cairo Supermarket',
      governorate: 'cairo',
      cities: ['nasr_city', 'heliopolis'],
    },
    {
      id: 'maadi_local_1',
      nameAr: 'متجر المعادي',
      nameEn: 'Maadi Store',
      governorate: 'cairo',
      cities: ['maadi'],
    },
  ],
  giza: [],
  alexandria: [],
};

// ============================================
// HELPER FUNCTIONS FOR LOCAL STORE NAMES
// ============================================

export const getLocalStoreNamesByGovernorate = (governorate: GovernorateId): LocalStoreName[] => {
  return localStoreNames[governorate] || [];
};

export const getLocalStoreNamesByCity = (governorate: GovernorateId, city?: CityId): LocalStoreName[] => {
  const allStores = localStoreNames[governorate] || [];

  if (!city) {
    return allStores;
  }

  return allStores.filter(store => {
    if (!store.cities || store.cities.length === 0) {
      return true;
    }
    return store.cities.includes(city);
  });
};

export const getLocalStoreNameById = (id: string, governorate: GovernorateId): LocalStoreName | undefined => {
  const stores = localStoreNames[governorate] || [];
  return stores.find(store => store.id === id);
};

// ============================================
// HELPER FUNCTIONS FOR LOCATION
// ============================================

export const getCitiesByGovernorate = (governorateId: GovernorateId): CityId[] => {
  return Object.keys(cityNames).filter(
    cityId => cityNames[cityId as CityId].governorate === governorateId
  ) as CityId[];
};

export const getGovernorateName = (governorateId: GovernorateId, lang: 'ar' | 'en' = 'ar'): string => {
  return governorateNames[governorateId]?.[lang] || governorateId;
};

export const getCityName = (cityId: CityId, lang: 'ar' | 'en' = 'ar'): string => {
  return cityNames[cityId]?.[lang] || cityId;
};

export const getCityGovernorate = (cityId: CityId): GovernorateId => {
  return cityNames[cityId]?.governorate;
};
export const stores: Store[] = [
  // MULTI-CATEGORY STORES
  {
    id: 'carrefour',
    nameAr: 'كارفور',
    nameEn: 'Carrefour',
    logo: storeLogos.carrefour,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'hyperone',
    nameAr: 'هايبر وان',
    nameEn: 'HyperOne',
    logo: storeLogos.hyperone,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'kazyon',
    nameAr: 'كازيون',
    nameEn: 'Kazyon',
    logo: storeLogos.kazyon,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'awladragab',
    nameAr: 'أولاد رجب',
    nameEn: 'Awlad Ragab',
    logo: storeLogos.awladragab,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },

  // FOOD-FOCUSED STORES
  {
    id: 'metro',
    nameAr: 'مترو',
    nameEn: 'Metro',
    logo: storeLogos.metro,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'spinneys',
    nameAr: 'سبينيس',
    nameEn: 'Spinneys',
    logo: storeLogos.spinneys,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'seoudi',
    nameAr: 'سعودي',
    nameEn: 'Seoudi',
    logo: storeLogos.seoudi,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'kheirzaman',
    nameAr: 'خير زمان',
    nameEn: 'Kheir Zaman',
    logo: storeLogos.kheirzaman,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'fathalla',
    nameAr: 'فتح الله',
    nameEn: 'Fathalla',
    logo: storeLogos.fathalla,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'bim',
    nameAr: 'بيم',
    nameEn: 'BIM',
    logo: storeLogos.bim,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },

  // ELECTRONICS STORES
  {
    id: 'btech',
    nameAr: 'بي تك',
    nameEn: 'B.TECH',
    logo: storeLogos.btech,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'oscar',
    nameAr: 'أوسكار',
    nameEn: 'Oscar',
    logo: storeLogos.oscar,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },
  {
    id: 'extra',
    nameAr: 'إكسترا',
    nameEn: 'eXtra',
    logo: storeLogos.extra,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    branches: [],
  },

  // LOCAL STORES - BY GOVERNORATE
  {
    id: 'sharkia_local',
    nameAr: 'متاجر الشرقية',
    nameEn: 'Sharkia Local Stores',
    logo: storeLogos.sharkia_local,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    isLocal: true,
    governorate: 'sharkia',
    branches: [],
  },
  {
    id: 'dakahlia_local',
    nameAr: 'متاجر الدقهلية',
    nameEn: 'Dakahlia Local Stores',
    logo: storeLogos.dakahlia_local,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    isLocal: true,
    governorate: 'dakahlia',
    branches: [],
  },
  {
    id: 'cairo_local',
    nameAr: 'متاجر القاهرة',
    nameEn: 'Cairo Local Stores',
    logo: storeLogos.cairo_local,
    categories: ['general', 'food_groceries', 'electronics', 'home', 'fashion'],
    isLocal: true,
    governorate: 'cairo',
    branches: [],
  },
];
// ============================================
// BRANCHES DATA (Organized by Governorate)
// ============================================

export const sharkiaBranches: Branch[] = [
  // NATIONAL STORES IN ZAGAZIG
  {
    id: 'carrefour-zagazig-mall',
    storeId: 'carrefour',
    addressAr: 'مول الزقازيق، طريق الإسماعيلية، الزقازيق، الشرقية',
    addressEn: 'Zagazig Mall, Ismailia Road, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5932,
    longitude: 31.5112,
    openingHours: '9:00 ص - 11:00 م',
    phone: '+20552478965',
  },
  {
    id: 'kazyon-zagazig-galaa',
    storeId: 'kazyon',
    addressAr: 'شارع الجلاء، الزقازيق، الشرقية',
    addressEn: 'El-Galaa Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5877,
    longitude: 31.5020,
    openingHours: '8:00 ص - 12:00 ص',
    phone: '+20552365478',
  },
  {
    id: 'kazyon-zagazig-orabi',
    storeId: 'kazyon',
    addressAr: 'شارع أحمد عرابي، الزقازيق، الشرقية',
    addressEn: 'Ahmed Orabi Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5912,
    longitude: 31.5045,
    openingHours: '8:00 ص - 12:00 ص',
    phone: '+20552398741',
  },
  {
    id: 'metro-zagazig-farouk',
    storeId: 'metro',
    addressAr: 'شارع فاروق، الزقازيق، الشرقية',
    addressEn: 'Farouk Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5890,
    longitude: 31.5050,
    openingHours: '8:00 ص - 11:00 م',
    phone: '+20552456789',
  },
  {
    id: 'btech-zagazig-mall',
    storeId: 'btech',
    addressAr: 'مول الزقازيق، الزقازيق، الشرقية',
    addressEn: 'Zagazig Mall, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5935,
    longitude: 31.5115,
    openingHours: '10:00 ص - 10:00 م',
    phone: '+20552223344',
  },

  // LOCAL SHARKIA STORES - ZAGAZIG
  {
    id: 'zahran-zagazig-galaa',
    storeId: 'sharkia_local',
    storeName: 'زهران',
    storeNameEn: 'Zahran',
    addressAr: 'شارع الجلاء، الزقازيق، الشرقية',
    addressEn: 'El-Galaa Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5880,
    longitude: 31.5025,
    openingHours: '8:00 ص - 12:00 ص',
    phone: '+20552365400',
  },
  {
    id: 'zahran-zagazig-geish',
    storeId: 'sharkia_local',
    storeName: 'زهران',
    storeNameEn: 'Zahran',
    addressAr: 'شارع الجيش، الزقازيق، الشرقية',
    addressEn: 'El-Geish Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5850,
    longitude: 31.5000,
    openingHours: '8:00 ص - 12:00 ص',
    phone: '+20552334455',
  },
  {
    id: 'raya-zagazig-orabi',
    storeId: 'sharkia_local',
    storeName: 'راية',
    storeNameEn: 'Raya',
    addressAr: 'شارع أحمد عرابي، الزقازيق، الشرقية',
    addressEn: 'Ahmed Orabi Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5905,
    longitude: 31.5040,
    openingHours: '8:00 ص - 11:00 م',
    phone: '+20552445566',
  },
  {
    id: 'raya-zagazig-horreya',
    storeId: 'sharkia_local',
    storeName: 'راية',
    storeNameEn: 'Raya',
    addressAr: 'شارع الحرية، الزقازيق، الشرقية',
    addressEn: 'El-Horreya Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5875,
    longitude: 31.5035,
    openingHours: '8:00 ص - 11:00 م',
    phone: '+20552778899',
  },
  {
    id: 'abouelsaoud-zagazig-hosseiny',
    storeId: 'sharkia_local',
    storeName: 'أبو السعود',
    storeNameEn: 'Abou El Saoud',
    addressAr: 'شارع الحسيني، الزقازيق، الشرقية',
    addressEn: 'El-Hosseiny Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5870,
    longitude: 31.5040,
    openingHours: '9:00 ص - 11:00 م',
    phone: '+20552667788',
  },
  {
    id: 'abouelsaoud-zagazig-saad',
    storeId: 'sharkia_local',
    storeName: 'أبو السعود',
    storeNameEn: 'Abou El Saoud',
    addressAr: 'شارع سعد زغلول، الزقازيق، الشرقية',
    addressEn: 'Saad Zaghloul Street, Zagazig, Sharqia',
    governorate: 'sharkia',
    city: 'zagazig',
    latitude: 30.5865,
    longitude: 31.5025,
    openingHours: '9:00 ص - 11:00 م',
    phone: '+20552556677',
  },
];

export const dakahliaBranches: Branch[] = [];

export const cairoBranches: Branch[] = [];

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getStoreById = (storeId: string): Store | undefined => {
  return stores.find(s => s.id === storeId);
};

export const getBranchesByStore = (storeId: string): Branch[] => {
  const allBranches = [...sharkiaBranches, ...dakahliaBranches, ...cairoBranches];
  return allBranches.filter(b => b.storeId === storeId);
};

export const getBranchesByGovernorate = (governorate: GovernorateId): Branch[] => {
  switch (governorate) {
    case 'sharkia':
      return sharkiaBranches;
    case 'dakahlia':
      return dakahliaBranches;
    case 'cairo':
      return cairoBranches;
    default:
      return [];
  }
};

export const getBranchesByCity = (cityId: CityId): Branch[] => {
  const allBranches = [...sharkiaBranches, ...dakahliaBranches, ...cairoBranches];
  return allBranches.filter(b => b.city === cityId);
};

export const getBranchesByUserLocation = (
  governorate: GovernorateId,
  city?: CityId
): Branch[] => {
  const governorateBranches = getBranchesByGovernorate(governorate);

  if (city) {
    return governorateBranches.filter(b => b.city === city);
  }

  return governorateBranches;
};

export const getStoresByUserLocation = (
  governorate: GovernorateId,
  city?: CityId
): Store[] => {
  const branches = getBranchesByUserLocation(governorate, city);
  const storeIds = new Set(branches.map(b => b.storeId));

  return stores
    .filter(s => storeIds.has(s.id))
    .map(store => ({
      ...store,
      branches: branches.filter(b => b.storeId === store.id),
    }));
};

export const getAllBranches = (): Branch[] => {
  return [...sharkiaBranches, ...dakahliaBranches, ...cairoBranches];
};

export const getStoresByCategory = (categoryId: string): Store[] => {
  return stores.filter(s => s.categories?.includes(categoryId));
};

export const getNationalStores = (): Store[] => {
  return stores.filter(s => !s.isLocal);
};

export const getLocalStoresByGovernorate = (governorate?: GovernorateId): Store[] => {
  if (governorate) {
    return stores.filter(s => s.isLocal && s.governorate === governorate);
  }
  return stores.filter(s => s.isLocal);
};

export const searchStores = (query: string): Store[] => {
  const lowerQuery = query.toLowerCase();
  return stores.filter(
    s =>
      s.nameAr.toLowerCase().includes(lowerQuery) ||
      s.nameEn.toLowerCase().includes(lowerQuery)
  );
};

export const getBranchCountText = (
  count: number,
  governorate?: GovernorateId
): string => {
  if (count === 0) return 'لا توجد فروع';
  if (count === 1) return 'فرع واحد';
  if (count === 2) return 'فرعان';

  const governorateText = governorate
    ? ` في ${getGovernorateName(governorate)}`
    : '';

  return `${count} فروع${governorateText}`;
};

export default stores;