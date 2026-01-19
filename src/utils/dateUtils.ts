// src/utils/dateUtils.ts - Centralized date handling utilities with Egypt timezone + SAFE NULL CHECKS

/**
 * EGYPT TIMEZONE CONSTANT (UTC+2)
 */
const EGYPT_TIMEZONE_OFFSET = 2; // hours

/**
 * Get current date/time in Egypt timezone
 */
export const getEgyptTime = (): Date => {
  const now = new Date();
  // Add Egypt timezone offset (UTC+2)
  const egyptTime = new Date(now.getTime() + (EGYPT_TIMEZONE_OFFSET * 60 * 60 * 1000));
  return egyptTime;
};

/**
 * Get today's date in YYYY-MM-DD format (Egypt timezone)
 */
export const getTodayString = (): string => {
  const egyptTime = getEgyptTime();

  const year = egyptTime.getUTCFullYear();
  const month = String(egyptTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(egyptTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Normalize a date string to YYYY-MM-DD format with zero-padding
 * Handles formats like:
 * - "2026-1-1" -> "2026-01-01"
 * - "2026-01-01" -> "2026-01-01"
 * - "2026-1-1T00:00:00" -> "2026-01-01"
 *
 * Returns null for invalid/null/undefined inputs
 */
export const normalizeDateString = (dateStr: string | null | undefined): string => {
  // Handle null/undefined
  if (!dateStr) {
    console.warn('⚠️ normalizeDateString: received null/undefined date');
    return '';
  }

  // Remove any time component
  const dateOnly = dateStr.split('T')[0];

  // Parse the date parts
  const parts = dateOnly.split('-');
  if (parts.length !== 3) {
    console.warn(`⚠️ Invalid date format: ${dateStr}`);
    return dateOnly;
  }

  const [year, month, day] = parts;

  // Zero-pad month and day
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');

  return `${year}-${paddedMonth}-${paddedDay}`;
};

/**
 * Check if a date range is currently active (Egypt timezone)
 * Returns false for invalid dates
 */
export const isDateRangeActive = (startDate: string | null | undefined, endDate: string | null | undefined): boolean => {
  if (!startDate || !endDate) return false;

  const today = getTodayString();
  const normalizedStart = normalizeDateString(startDate);
  const normalizedEnd = normalizeDateString(endDate);

  if (!normalizedStart || !normalizedEnd) return false;

  return normalizedStart <= today && normalizedEnd >= today;
};

/**
 * Check if a date is in the future (upcoming) (Egypt timezone)
 * Returns false for invalid dates
 */
export const isDateUpcoming = (startDate: string | null | undefined): boolean => {
  if (!startDate) return false;

  const today = getTodayString();
  const normalizedStart = normalizeDateString(startDate);

  if (!normalizedStart) return false;

  return normalizedStart > today;
};

/**
 * Check if a date is in the past (expired) (Egypt timezone)
 * Returns false for invalid dates
 */
export const isDateExpired = (endDate: string | null | undefined): boolean => {
  if (!endDate) return false;

  const today = getTodayString();
  const normalizedEnd = normalizeDateString(endDate);

  if (!normalizedEnd) return false;

  return normalizedEnd < today;
};

/**
 * Get the status of a date range
 */
export type DateRangeStatus = 'active' | 'upcoming' | 'expired';

export const getDateRangeStatus = (startDate: string | null | undefined, endDate: string | null | undefined): DateRangeStatus => {
  if (isDateRangeActive(startDate, endDate)) return 'active';
  if (isDateUpcoming(startDate)) return 'upcoming';
  return 'expired';
};

/**
 * Compare two dates (returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2)
 * Returns 0 for invalid dates
 */
export const compareDates = (date1: string | null | undefined, date2: string | null | undefined): number => {
  if (!date1 || !date2) return 0;

  const normalized1 = normalizeDateString(date1);
  const normalized2 = normalizeDateString(date2);

  if (!normalized1 || !normalized2) return 0;

  if (normalized1 < normalized2) return -1;
  if (normalized1 > normalized2) return 1;
  return 0;
};

/**
 * Get days remaining until end date (Egypt timezone)
 * Returns -1 for invalid dates
 */
export const getDaysRemaining = (endDate: string | null | undefined): number => {
  if (!endDate) return -1;

  const today = getTodayString();
  const normalizedEnd = normalizeDateString(endDate);

  if (!normalizedEnd) return -1;

  const todayDate = new Date(today);
  const endDateObj = new Date(normalizedEnd);

  const diffTime = endDateObj.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Format date for display (Arabic)
 * Returns fallback text for invalid dates
 */
export const formatDateAr = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'غير محدد';

  try {
    const normalized = normalizeDateString(dateStr);
    if (!normalized) return 'غير محدد';

    const date = new Date(normalized);
    if (isNaN(date.getTime())) return 'غير محدد';

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString('ar-EG', options);
  } catch (error) {
    console.warn('⚠️ Error formatting date:', dateStr, error);
    return 'غير محدد';
  }
};

/**
 * Format date range for display
 * Returns fallback text for invalid dates
 */
export const formatDateRange = (startDate: string | null | undefined, endDate: string | null | undefined): string => {
  if (!startDate || !endDate) return 'غير محدد';

  try {
    const normalizedStart = normalizeDateString(startDate);
    const normalizedEnd = normalizeDateString(endDate);

    if (!normalizedStart || !normalizedEnd) return 'غير محدد';

    const start = new Date(normalizedStart);
    const end = new Date(normalizedEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'غير محدد';

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };

    const startStr = start.toLocaleDateString('ar-EG', options);
    const endStr = end.toLocaleDateString('ar-EG', options);

    return `${startStr} - ${endStr}`;
  } catch (error) {
    console.warn('⚠️ Error formatting date range:', startDate, endDate, error);
    return 'غير محدد';
  }
};