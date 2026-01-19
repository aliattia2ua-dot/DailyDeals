// src/data/categories.ts - ENHANCED VERSION for Egyptian Supermarkets
import { Category } from '../types';

/**
 * Main category IDs - These are the 4 major categories for home page
 */
export const MAIN_CATEGORY_IDS = {
  FOOD_GROCERIES: 'food_groceries',
  ELECTRONICS: 'electronics',
  HOME: 'home',
  FASHION: 'fashion',
} as const;

/**
 * Main Categories - 4 major categories for home page (Egyptian supermarkets focus)
 */
export const mainCategories: Category[] = [
  {
    id: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    nameAr: 'غذائية',
    nameEn: 'Groceries',
    icon: 'cart',
    color: '#e63946',
  },
  {
    id: MAIN_CATEGORY_IDS.ELECTRONICS,
    nameAr: 'إلكترونيات وأجهزة',
    nameEn: 'Electronics',
    icon: 'phone-portrait',
    color: '#457b9d',
  },
  {
    id: MAIN_CATEGORY_IDS.HOME,
    nameAr: 'أدوات منزلية', // ✅ CHANGED FROM 'منزل'
    nameEn: 'Home Supplies', // ✅ ALSO UPDATED ENGLISH NAME
    icon: 'home',
    color: '#2a9d8f',
  },
  {
    id: MAIN_CATEGORY_IDS.FASHION,
    nameAr: 'ملابس و مستحضرات تجميل',
    nameEn: 'Fashion & Beauty',
    icon: 'shirt',
    color: '#f4a261',
  },
];

/**
 * Main Subcategories - Simplified list for offers page filter (top level)
 * These appear as filter chips in the offers/flyers screen
 */
export const mainSubcategories: Category[] = [
  // Groceries Main Subs
  {
    id: 'fresh_produce',
    nameAr: 'خضروات وفواكه',
    nameEn: 'Fresh Produce',
    icon: 'leaf',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'meat_poultry_fish',
    nameAr: 'لحوم ودواجن وأسماك',
    nameEn: 'Meat, Poultry & Fish',
    icon: 'restaurant',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'dairy_eggs_cheese',
    nameAr: 'ألبان وبيض وجبن',
    nameEn: 'Dairy, Eggs & Cheese',
    icon: 'egg',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'bakery_bread',
    nameAr: 'مخبوزات وخبز',
    nameEn: 'Bakery & Bread',
    icon: 'pizza',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'beverages',
    nameAr: 'مشروبات',
    nameEn: 'Beverages',
    icon: 'cafe',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'snacks_sweets',
    nameAr: 'سناكس وحلويات',
    nameEn: 'Snacks & Sweets',
    icon: 'fast-food',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'frozen_foods',
    nameAr: 'أطعمة مجمدة',
    nameEn: 'Frozen Foods',
    icon: 'snow',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'canned_packaged',
    nameAr: 'معلبات ومواد غذائية',
    nameEn: 'Canned & Packaged',
    icon: 'archive',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'rice_pasta_grains',
    nameAr: 'أرز ومكرونة وحبوب',
    nameEn: 'Rice, Pasta & Grains',
    icon: 'nutrition',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'oils_spices',
    nameAr: 'زيوت وبهارات',
    nameEn: 'Oils & Spices',
    icon: 'flask',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },
  {
    id: 'baby_food',
    nameAr: 'أطعمة أطفال',
    nameEn: 'Baby Food',
    icon: 'happy',
    parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
  },

  // Electronics Main Subs
  {
    id: 'mobile_phones',
    nameAr: 'موبايلات وتابلت',
    nameEn: 'Mobile & Tablets',
    icon: 'phone-portrait',
    parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
  },
  {
    id: 'tv_audio',
    nameAr: 'تلفزيونات وصوتيات',
    nameEn: 'TV & Audio',
    icon: 'tv',
    parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
  },
  {
    id: 'computers',
    nameAr: 'كمبيوتر ولابتوب',
    nameEn: 'Computers',
    icon: 'laptop',
    parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
  },
  {
    id: 'kitchen_appliances',
    nameAr: 'أجهزة المطبخ الكهربائية',
    nameEn: 'Kitchen Appliances',
    icon: 'hardware-chip',
    parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
  },
  {
    id: 'washing_cooling',
    nameAr: 'غسالات وتكييف وثلاجات',
    nameEn: 'Washing, Cooling & Refrigeration',
    icon: 'snow',
    parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
  },
  {
    id: 'small_appliances',
    nameAr: 'أجهزة كهربائية صغيرة',
    nameEn: 'Small Appliances',
    icon: 'bulb',
    parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
  },

  // Home Main Subs
  {
    id: 'furniture',
    nameAr: 'أثاث',
    nameEn: 'Furniture',
    icon: 'bed',
    parentId: MAIN_CATEGORY_IDS.HOME,
  },
  {
    id: 'kitchenware',
    nameAr: 'أدوات المطبخ',
    nameEn: 'Kitchenware',
    icon: 'restaurant',
    parentId: MAIN_CATEGORY_IDS.HOME,
  },
  {
    id: 'cleaning_detergents',
    nameAr: 'منظفات ومطهرات',
    nameEn: 'Cleaning & Detergents',
    icon: 'water',
    parentId: MAIN_CATEGORY_IDS.HOME,
  },
  {
    id: 'home_textiles',
    nameAr: 'منسوجات منزلية',
    nameEn: 'Home Textiles',
    icon: 'shirt',
    parentId: MAIN_CATEGORY_IDS.HOME,
  },

  // Fashion Main Subs
  {
    id: 'mens_clothing',
    nameAr: 'ملابس رجالي',
    nameEn: "Men's Clothing",
    icon: 'shirt',
    parentId: MAIN_CATEGORY_IDS.FASHION,
  },
  {
    id: 'womens_clothing',
    nameAr: 'ملابس حريمي',
    nameEn: "Women's Clothing",
    icon: 'woman',
    parentId: MAIN_CATEGORY_IDS.FASHION,
  },
  {
    id: 'kids_clothing',
    nameAr: 'ملابس أطفال',
    nameEn: "Kids' Clothing",
    icon: 'happy',
    parentId: MAIN_CATEGORY_IDS.FASHION,
  },
  {
    id: 'personal_care',
    nameAr: 'عناية شخصية',
    nameEn: 'Personal Care',
    icon: 'heart',
    parentId: MAIN_CATEGORY_IDS.FASHION,
  },
  {
    id: 'beauty_cosmetics',
    nameAr: 'تجميل ومكياج',
    nameEn: 'Beauty & Cosmetics',
    icon: 'sparkles',
    parentId: MAIN_CATEGORY_IDS.FASHION,
  },
];

/**
 * Detailed Subcategories - Full hierarchical list for admin dropdown
 * This includes all possible categories for detailed classification
 */
export const detailedSubcategories: Record<string, Category[]> = {
  // Groceries - Detailed breakdown
  [MAIN_CATEGORY_IDS.FOOD_GROCERIES]: [
    {
      id: 'fresh_produce',
      nameAr: 'خضروات وفواكه',
      nameEn: 'Fresh Produce',
      icon: 'leaf',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'meat_poultry_fish',
      nameAr: 'لحوم ودواجن وأسماك',
      nameEn: 'Meat, Poultry & Fish',
      icon: 'restaurant',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'dairy_eggs_cheese',
      nameAr: 'ألبان وبيض وجبن',
      nameEn: 'Dairy, Eggs & Cheese',
      icon: 'egg',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'bakery_bread',
      nameAr: 'مخبوزات وخبز',
      nameEn: 'Bakery & Bread',
      icon: 'pizza',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'beverages',
      nameAr: 'مشروبات',
      nameEn: 'Beverages',
      icon: 'cafe',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'snacks_sweets',
      nameAr: 'سناكس وحلويات',
      nameEn: 'Snacks & Sweets',
      icon: 'fast-food',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'frozen_foods',
      nameAr: 'أطعمة مجمدة',
      nameEn: 'Frozen Foods',
      icon: 'snow',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'canned_packaged',
      nameAr: 'معلبات ومواد غذائية',
      nameEn: 'Canned & Packaged',
      icon: 'archive',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'rice_pasta_grains',
      nameAr: 'أرز ومكرونة وحبوب',
      nameEn: 'Rice, Pasta & Grains',
      icon: 'nutrition',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'oils_spices',
      nameAr: 'زيوت وبهارات',
      nameEn: 'Oils & Spices',
      icon: 'flask',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
    {
      id: 'baby_food',
      nameAr: 'أطعمة أطفال',
      nameEn: 'Baby Food',
      icon: 'happy',
      parentId: MAIN_CATEGORY_IDS.FOOD_GROCERIES,
    },
  ],

  // Electronics - Detailed breakdown
  [MAIN_CATEGORY_IDS.ELECTRONICS]: [
    {
      id: 'mobile_phones',
      nameAr: 'موبايلات وتابلت',
      nameEn: 'Mobile & Tablets',
      icon: 'phone-portrait',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'tv_audio',
      nameAr: 'تلفزيونات وصوتيات',
      nameEn: 'TV & Audio',
      icon: 'tv',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'computers',
      nameAr: 'كمبيوتر ولابتوب',
      nameEn: 'Computers',
      icon: 'laptop',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'kitchen_appliances',
      nameAr: 'أجهزة المطبخ الكهربائية',
      nameEn: 'Kitchen Appliances',
      icon: 'hardware-chip',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'washing_cooling',
      nameAr: 'غسالات وتكييف وثلاجات',
      nameEn: 'Washing, Cooling & Refrigeration',
      icon: 'snow',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'small_appliances',
      nameAr: 'أجهزة كهربائية صغيرة',
      nameEn: 'Small Appliances',
      icon: 'bulb',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'cameras',
      nameAr: 'كاميرات',
      nameEn: 'Cameras',
      icon: 'camera',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'gaming',
      nameAr: 'ألعاب فيديو',
      nameEn: 'Gaming',
      icon: 'game-controller',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: 'accessories',
      nameAr: 'إكسسوارات إلكترونية',
      nameEn: 'Electronics Accessories',
      icon: 'headset',
      parentId: MAIN_CATEGORY_IDS.ELECTRONICS,
    },
  ],

  // Home - Detailed breakdown
  [MAIN_CATEGORY_IDS.HOME]: [
    {
      id: 'furniture',
      nameAr: 'أثاث',
      nameEn: 'Furniture',
      icon: 'bed',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'home_textiles',
      nameAr: 'منسوجات منزلية',
      nameEn: 'Home Textiles',
      icon: 'shirt',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'kitchenware',
      nameAr: 'أدوات المطبخ',
      nameEn: 'Kitchenware',
      icon: 'restaurant',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'bathroom',
      nameAr: 'أدوات الحمام',
      nameEn: 'Bathroom',
      icon: 'water',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'cleaning_detergents',
      nameAr: 'منظفات ومطهرات',
      nameEn: 'Cleaning & Detergents',
      icon: 'water',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'storage_organization',
      nameAr: 'تخزين وتنظيم',
      nameEn: 'Storage & Organization',
      icon: 'file-tray',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'lighting',
      nameAr: 'إضاءة',
      nameEn: 'Lighting',
      icon: 'bulb',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'decor',
      nameAr: 'ديكور',
      nameEn: 'Decor',
      icon: 'color-palette',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'garden_outdoor',
      nameAr: 'حديقة وخارجي',
      nameEn: 'Garden & Outdoor',
      icon: 'flower',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
    {
      id: 'pet_supplies',
      nameAr: 'مستلزمات حيوانات أليفة',
      nameEn: 'Pet Supplies',
      icon: 'paw',
      parentId: MAIN_CATEGORY_IDS.HOME,
    },
  ],

  // Fashion - Detailed breakdown
  [MAIN_CATEGORY_IDS.FASHION]: [
    {
      id: 'mens_clothing',
      nameAr: 'ملابس رجالي',
      nameEn: "Men's Clothing",
      icon: 'shirt',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'womens_clothing',
      nameAr: 'ملابس حريمي',
      nameEn: "Women's Clothing",
      icon: 'woman',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'kids_clothing',
      nameAr: 'ملابس أطفال',
      nameEn: "Kids' Clothing",
      icon: 'happy',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'footwear',
      nameAr: 'أحذية',
      nameEn: 'Footwear',
      icon: 'footsteps',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'bags_accessories',
      nameAr: 'شنط وإكسسوارات',
      nameEn: 'Bags & Accessories',
      icon: 'briefcase',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'watches_jewelry',
      nameAr: 'ساعات ومجوهرات',
      nameEn: 'Watches & Jewelry',
      icon: 'diamond',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'personal_care',
      nameAr: 'عناية شخصية',
      nameEn: 'Personal Care',
      icon: 'heart',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'beauty_cosmetics',
      nameAr: 'تجميل ومكياج',
      nameEn: 'Beauty & Cosmetics',
      icon: 'sparkles',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'perfumes',
      nameAr: 'عطور',
      nameEn: 'Perfumes',
      icon: 'rose',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
    {
      id: 'baby_care',
      nameAr: 'عناية بالأطفال',
      nameEn: 'Baby Care',
      icon: 'happy',
      parentId: MAIN_CATEGORY_IDS.FASHION,
    },
  ],
};

/**
 * Get all categories (main + all subcategories)
 */
export const getAllCategories = (): Category[] => {
  const allDetailedSubs = Object.values(detailedSubcategories).flat();
  return [...mainCategories, ...allDetailedSubs];
};

/**
 * Get main categories only (for home page - 4 categories)
 */
export const getMainCategories = (): Category[] => {
  return mainCategories;
};

/**
 * Get main subcategories for offers page filter
 * These are the top-level filters shown in the offers screen
 */
export const getMainSubcategories = (mainCategoryId?: string): Category[] => {
  if (mainCategoryId) {
    return mainSubcategories.filter(cat => cat.parentId === mainCategoryId);
  }
  return mainSubcategories;
};

/**
 * Get detailed subcategories for admin dropdown
 * This includes all possible subcategories for detailed classification
 */
export const getDetailedSubcategories = (mainCategoryId: string): Category[] => {
  return detailedSubcategories[mainCategoryId] || [];
};

/**
 * Get category by ID
 */
export const getCategoryById = (categoryId: string): Category | undefined => {
  const allCategories = getAllCategories();
  return allCategories.find(cat => cat.id === categoryId);
};

/**
 * Get main category for a subcategory
 */
export const getMainCategoryForSubcategory = (subcategoryId: string): Category | undefined => {
  const subcategory = getCategoryById(subcategoryId);
  if (!subcategory?.parentId) return undefined;
  return getCategoryById(subcategory.parentId);
};

/**
 * Check if category is a main category
 */
export const isMainCategory = (categoryId: string): boolean => {
  return mainCategories.some(cat => cat.id === categoryId);
};

/**
 * Get category hierarchy (main category + subcategory)
 */
export const getCategoryHierarchy = (categoryId: string): {
  main: Category | undefined;
  sub: Category | undefined;
} => {
  const category = getCategoryById(categoryId);

  if (!category) {
    return { main: undefined, sub: undefined };
  }

  if (isMainCategory(categoryId)) {
    return { main: category, sub: undefined };
  }

  const mainCategory = getMainCategoryForSubcategory(categoryId);
  return { main: mainCategory, sub: category };
};

/**
 * Get categories for catalogue assignment (main categories only)
 * Catalogues are assigned to main categories
 */
export const getCatalogueCategories = (): Category[] => {
  return mainCategories;
};

/**
 * Get categories for offer assignment (detailed subcategories)
 * Offers are assigned to detailed subcategories
 */
export const getOfferCategories = (): { main: Category; subs: Category[] }[] => {
  return mainCategories.map(main => ({
    main,
    subs: detailedSubcategories[main.id] || [],
  }));
};