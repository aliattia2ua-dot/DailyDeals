import { Platform } from 'react-native';
import type { Offer, Catalogue, CataloguePage } from '../types';

// Alternative placeholder service
const PLACEHOLDER_BASE = 'https://placehold.co';

const createPlaceholder = (width: number, height: number, text: string) => {
  const encodedText = encodeURIComponent(text);
  return `${PLACEHOLDER_BASE}/${width}x${height}/e63946/ffffff?text=${encodedText}`;
};

// Helper to get dates for offers (current week)
const getOfferDates = () => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay());

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

const { startDate, endDate } = getOfferDates();

// FIXED: Helper to get PDF URL based on platform
const getPdfUrl = (filename: string): string => {
  if (Platform.OS === 'web') {
    // For web, PDFs should be in public/catalogues folder
    // Expo web serves files from public folder at root URL
    return `/catalogues/${filename}`;
  } else {
    // For native, return the filename - will be handled by expo-asset
    return filename;
  }
};

// Sample offers for Kazyon
export const kazyonOffers: Offer[] = [
  {
    id: 'kazyon-offer-1',
    storeId: 'kazyon',
    catalogueId: 'kazyon-catalogue-1',
    nameAr: 'أرز مصري فاخر',
    nameEn: 'Premium Egyptian Rice',
    descriptionAr: 'أرز مصري فاخر عبوة 5 كيلو',
    descriptionEn: 'Premium Egyptian Rice 5kg bag',
    originalPrice: 180,
    offerPrice: 155,
    currency: 'EGP',
    unit: '5 kg',
    categoryId: 'rice-grains',
    imageUrl: createPlaceholder(300, 300, 'Rice'),
    startDate,
    endDate,
    isFeatured: true,
  },
  {
    id: 'kazyon-offer-2',
    storeId: 'kazyon',
    catalogueId: 'kazyon-catalogue-1',
    nameAr: 'زيت عباد الشمس',
    nameEn: 'Sunflower Oil',
    descriptionAr: 'زيت عباد الشمس نقي 2 لتر',
    descriptionEn: 'Pure Sunflower Oil 2L',
    originalPrice: 145,
    offerPrice: 120,
    currency: 'EGP',
    unit: '2 L',
    categoryId: 'oils-ghee',
    imageUrl: createPlaceholder(300, 300, 'Oil'),
    startDate,
    endDate,
    isFeatured: true,
  },
  {
    id: 'kazyon-offer-3',
    storeId: 'kazyon',
    catalogueId: 'kazyon-catalogue-1',
    nameAr: 'فراخ كاملة مجمدة',
    nameEn: 'Frozen Whole Chicken',
    descriptionAr: 'فراخ كاملة مجمدة وزن 1.2 كيلو',
    descriptionEn: 'Frozen Whole Chicken 1.2kg',
    originalPrice: 130,
    offerPrice: 110,
    currency: 'EGP',
    unit: '1.2 kg',
    categoryId: 'meat-poultry',
    imageUrl: createPlaceholder(300, 300, 'Chicken'),
    startDate,
    endDate,
  },
  {
    id: 'kazyon-offer-4',
    storeId: 'kazyon',
    catalogueId: 'kazyon-catalogue-1',
    nameAr: 'جبنة بيضاء',
    nameEn: 'White Cheese',
    descriptionAr: 'جبنة بيضاء طازجة 1 كيلو',
    descriptionEn: 'Fresh White Cheese 1kg',
    originalPrice: 95,
    offerPrice: 80,
    currency: 'EGP',
    unit: '1 kg',
    categoryId: 'dairy',
    imageUrl: createPlaceholder(300, 300, 'Cheese'),
    startDate,
    endDate,
  },
  {
    id: 'kazyon-offer-5',
    storeId: 'kazyon',
    catalogueId: 'kazyon-catalogue-1',
    nameAr: 'لبن كامل الدسم',
    nameEn: 'Full Cream Milk',
    descriptionAr: 'لبن كامل الدسم 1 لتر',
    descriptionEn: 'Full Cream Milk 1L',
    originalPrice: 35,
    offerPrice: 28,
    currency: 'EGP',
    unit: '1 L',
    categoryId: 'dairy',
    imageUrl: createPlaceholder(300, 300, 'Milk'),
    startDate,
    endDate,
  },
  {
    id: 'kazyon-offer-6',
    storeId: 'kazyon',
    catalogueId: 'kazyon-catalogue-1',
    nameAr: 'مسحوق غسيل',
    nameEn: 'Laundry Detergent',
    descriptionAr: 'مسحوق غسيل 3 كيلو',
    descriptionEn: 'Laundry Detergent 3kg',
    originalPrice: 120,
    offerPrice: 95,
    currency: 'EGP',
    unit: '3 kg',
    categoryId: 'household',
    imageUrl: createPlaceholder(300, 300, 'Detergent'),
    startDate,
    endDate,
  },
  {
    id: 'kazyon-offer-7',
    storeId: 'kazyon',
    catalogueId: 'kazyon-catalogue-1',
    nameAr: 'كولا 2.25 لتر',
    nameEn: 'Cola 2.25L',
    descriptionAr: 'مشروب غازي كولا 2.25 لتر',
    descriptionEn: 'Cola Soft Drink 2.25L',
    originalPrice: 30,
    offerPrice: 25,
    currency: 'EGP',
    unit: '2.25 L',
    categoryId: 'beverages',
    imageUrl: createPlaceholder(300, 300, 'Cola'),
    startDate,
    endDate,
  },
];

// Sample offers for Carrefour
export const carrefourOffers: Offer[] = [
  {
    id: 'carrefour-offer-1',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'أرز بسمتي',
    nameEn: 'Basmati Rice',
    descriptionAr: 'أرز بسمتي هندي 2 كيلو',
    descriptionEn: 'Indian Basmati Rice 2kg',
    originalPrice: 160,
    offerPrice: 135,
    currency: 'EGP',
    unit: '2 kg',
    categoryId: 'rice-grains',
    imageUrl: createPlaceholder(300, 300, 'Basmati'),
    startDate,
    endDate,
    isFeatured: true,
  },
  {
    id: 'carrefour-offer-2',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'زيت زيتون',
    nameEn: 'Olive Oil',
    descriptionAr: 'زيت زيتون بكر ممتاز 500 مل',
    descriptionEn: 'Extra Virgin Olive Oil 500ml',
    originalPrice: 180,
    offerPrice: 150,
    currency: 'EGP',
    unit: '500 ml',
    categoryId: 'oils-ghee',
    imageUrl: createPlaceholder(300, 300, 'Olive+Oil'),
    startDate,
    endDate,
    isFeatured: true,
  },
  {
    id: 'carrefour-offer-3',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'لحم بقري مفروم',
    nameEn: 'Ground Beef',
    descriptionAr: 'لحم بقري مفروم طازج 500 جرام',
    descriptionEn: 'Fresh Ground Beef 500g',
    originalPrice: 180,
    offerPrice: 155,
    currency: 'EGP',
    unit: '500 g',
    categoryId: 'meat-poultry',
    imageUrl: createPlaceholder(300, 300, 'Beef'),
    startDate,
    endDate,
  },
  {
    id: 'carrefour-offer-4',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'جبنة شيدر',
    nameEn: 'Cheddar Cheese',
    descriptionAr: 'جبنة شيدر مستوردة 200 جرام',
    descriptionEn: 'Imported Cheddar Cheese 200g',
    originalPrice: 85,
    offerPrice: 70,
    currency: 'EGP',
    unit: '200 g',
    categoryId: 'dairy',
    imageUrl: createPlaceholder(300, 300, 'Cheddar'),
    startDate,
    endDate,
  },
  {
    id: 'carrefour-offer-5',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'شامبو للشعر',
    nameEn: 'Hair Shampoo',
    descriptionAr: 'شامبو للشعر 400 مل',
    descriptionEn: 'Hair Shampoo 400ml',
    originalPrice: 75,
    offerPrice: 60,
    currency: 'EGP',
    unit: '400 ml',
    categoryId: 'personal-care',
    imageUrl: createPlaceholder(300, 300, 'Shampoo'),
    startDate,
    endDate,
  },
  {
    id: 'carrefour-offer-6',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'حفاضات أطفال',
    nameEn: 'Baby Diapers',
    descriptionAr: 'حفاضات أطفال مقاس وسط 50 قطعة',
    descriptionEn: 'Baby Diapers Medium 50pcs',
    originalPrice: 220,
    offerPrice: 185,
    currency: 'EGP',
    unit: '50 pcs',
    categoryId: 'baby-products',
    imageUrl: createPlaceholder(300, 300, 'Diapers'),
    startDate,
    endDate,
  },
  {
    id: 'carrefour-offer-7',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'عصير برتقال',
    nameEn: 'Orange Juice',
    descriptionAr: 'عصير برتقال طبيعي 1 لتر',
    descriptionEn: 'Natural Orange Juice 1L',
    originalPrice: 45,
    offerPrice: 38,
    currency: 'EGP',
    unit: '1 L',
    categoryId: 'beverages',
    imageUrl: createPlaceholder(300, 300, 'Juice'),
    startDate,
    endDate,
  },
  {
    id: 'carrefour-offer-8',
    storeId: 'carrefour',
    catalogueId: 'carrefour-catalogue-1',
    nameAr: 'سماعات بلوتوث',
    nameEn: 'Bluetooth Earphones',
    descriptionAr: 'سماعات بلوتوث لاسلكية',
    descriptionEn: 'Wireless Bluetooth Earphones',
    originalPrice: 350,
    offerPrice: 280,
    currency: 'EGP',
    unit: 'piece',
    categoryId: 'electronics',
    imageUrl: createPlaceholder(300, 300, 'Earphones'),
    startDate,
    endDate,
    isFeatured: true,
  },
];

// All offers combined
export const offers: Offer[] = [...kazyonOffers, ...carrefourOffers];

// Catalogue pages
const kazyonPages: CataloguePage[] = [
  {
    id: 'kazyon-page-1',
    catalogueId: 'kazyon-catalogue-1',
    pageNumber: 1,
    imageUrl: createPlaceholder(400, 600, 'Kazyon Page 1'),
    offers: ['kazyon-offer-1', 'kazyon-offer-2'],
  },
  {
    id: 'kazyon-page-2',
    catalogueId: 'kazyon-catalogue-1',
    pageNumber: 2,
    imageUrl: createPlaceholder(400, 600, 'Kazyon Page 2'),
    offers: ['kazyon-offer-3', 'kazyon-offer-4', 'kazyon-offer-5'],
  },
  {
    id: 'kazyon-page-3',
    catalogueId: 'kazyon-catalogue-1',
    pageNumber: 3,
    imageUrl: createPlaceholder(400, 600, 'Kazyon Page 3'),
    offers: ['kazyon-offer-6', 'kazyon-offer-7'],
  },
];

const carrefourPages: CataloguePage[] = [
  {
    id: 'carrefour-page-1',
    catalogueId: 'carrefour-catalogue-1',
    pageNumber: 1,
    imageUrl: createPlaceholder(400, 600, 'Carrefour Page 1'),
    offers: ['carrefour-offer-1', 'carrefour-offer-2'],
  },
  {
    id: 'carrefour-page-2',
    catalogueId: 'carrefour-catalogue-1',
    pageNumber: 2,
    imageUrl: createPlaceholder(400, 600, 'Carrefour Page 2'),
    offers: ['carrefour-offer-3', 'carrefour-offer-4', 'carrefour-offer-5'],
  },
  {
    id: 'carrefour-page-3',
    catalogueId: 'carrefour-catalogue-1',
    pageNumber: 3,
    imageUrl: createPlaceholder(400, 600, 'Carrefour Page 3'),
    offers: ['carrefour-offer-6', 'carrefour-offer-7', 'carrefour-offer-8'],
  },
];

// FIXED: Use correct PDF filenames without the duplicate .pdf extension
export const catalogues: Catalogue[] = [
  {
    id: 'kazyon-catalogue-1',
    storeId: 'kazyon',
    titleAr: 'عروض الأسبوع - كازيون',
    titleEn: 'Weekly Offers - Kazyon',
    startDate,
    endDate,
    coverImage: createPlaceholder(400, 600, 'Kazyon Cover'),
    pdfUrl: getPdfUrl('kazyon_2025-12-23_2025-12-29.pdf'), // Fixed filename
    pages: kazyonPages,
  },
  {
    id: 'carrefour-catalogue-1',
    storeId: 'carrefour',
    titleAr: 'عروض الأسبوع - كارفور',
    titleEn: 'Weekly Offers - Carrefour',
    startDate,
    endDate,
    coverImage: createPlaceholder(400, 600, 'Carrefour Cover'),
    pdfUrl: getPdfUrl('catalogue_92b7a97e_1765366806.pdf'),
    pages: carrefourPages,
  },
];

// Helper functions
export const getOffersByStore = (storeId: string): Offer[] => {
  return offers.filter(offer => offer.storeId === storeId);
};

export const getOffersByCategory = (categoryId: string): Offer[] => {
  return offers.filter(offer => offer.categoryId === categoryId);
};

export const getFeaturedOffers = (): Offer[] => {
  return offers.filter(offer => offer.isFeatured);
};

export const getOfferById = (id: string): Offer | undefined => {
  return offers.find(offer => offer.id === id);
};

export const getCatalogueByStore = (storeId: string): Catalogue | undefined => {
  return catalogues.find(catalogue => catalogue.storeId === storeId);
};

export const getCatalogueById = (id: string): Catalogue | undefined => {
  return catalogues.find(catalogue => catalogue.id === id);
};

export const getOffersForPage = (pageOfferIds: string[]): Offer[] => {
  return pageOfferIds
    .map(id => getOfferById(id))
    .filter(Boolean) as Offer[];
};

export default offers;