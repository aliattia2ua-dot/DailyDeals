// src/assets/pdfRegistry.ts
// Static PDF asset registry for Metro bundler compatibility
// Dynamic requires don't work with Metro, so we need to statically map all PDFs

/**
 * Registry of all PDF catalogues in assets/catalogues folder
 * Key: filename, Value: require statement
 */
export const PDF_REGISTRY: Record<string, any> = {
  'kazyon_2025-12-23_2025-12-29.pdf': require('../../assets/catalogues/kazyon_2025-12-23_2025-12-29.pdf'),
  'catalogue_92b7a97e_1765366806.pdf': require('../../assets/catalogues/catalogue_92b7a97e_1765366806.pdf'),
};

/**
 * Get the asset module for a PDF filename
 * @param filename - The PDF filename
 * @returns The asset module or null if not found
 */
export const getPdfAsset = (filename: string): any | null => {
  return PDF_REGISTRY[filename] || null;
};

/**
 * Check if a PDF exists in the registry
 * @param filename - The PDF filename
 * @returns True if the PDF is registered
 */
export const isPdfRegistered = (filename: string): boolean => {
  return filename in PDF_REGISTRY;
};

/**
 * Get all registered PDF filenames
 * @returns Array of registered PDF filenames
 */
export const getRegisteredPdfs = (): string[] => {
  return Object.keys(PDF_REGISTRY);
};
