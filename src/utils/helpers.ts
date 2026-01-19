// Helper utility functions

// Format currency
export const formatCurrency = (amount: number, currency = 'EGP'): string => {
  return `${amount.toFixed(2)} ${currency === 'EGP' ? 'ج.م' : currency}`;
};

// Format date
export const formatDate = (dateString: string, locale: 'ar' | 'en' = 'ar'): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', options);
};

// Calculate discount percentage
export const calculateDiscount = (originalPrice: number, offerPrice: number): number => {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
};

// Check if offer is still valid
export const isOfferValid = (endDate: string): boolean => {
  const now = new Date();
  const end = new Date(endDate);
  return now <= end;
};

// Get days remaining for offer
export const getDaysRemaining = (endDate: string): number => {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Debounce function
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Get localized name based on language
export const getLocalizedName = (
  item: { nameAr: string; nameEn: string },
  language: 'ar' | 'en'
): string => {
  return language === 'ar' ? item.nameAr : item.nameEn;
};

// Get localized address based on language
export const getLocalizedAddress = (
  item: { addressAr: string; addressEn: string },
  language: 'ar' | 'en'
): string => {
  return language === 'ar' ? item.addressAr : item.addressEn;
};

// Get localized description based on language
export const getLocalizedDescription = (
  item: { descriptionAr?: string; descriptionEn?: string },
  language: 'ar' | 'en'
): string | undefined => {
  return language === 'ar' ? item.descriptionAr : item.descriptionEn;
};
