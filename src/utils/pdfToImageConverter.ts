
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface PDFPageImage {
  pageNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

class PDFToImageConverter {
  private pdfCache: Map<string, any> = new Map();

  /**
   * Load PDF document
   */
  async loadPDF(pdfUrl: string): Promise<any> {
    if (this.pdfCache.has(pdfUrl)) {
      return this.pdfCache.get(pdfUrl);
    }

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    this.pdfCache.set(pdfUrl, pdf);
    return pdf;
  }

  /**
   * Convert single PDF page to image
   */
  async convertPageToImage(
    pdf: any,
    pageNumber: number,
    scale: number = 2.0
  ): Promise<PDFPageImage> {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to data URL (JPEG for smaller size)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    return {
      pageNumber,
      imageDataUrl,
      width: viewport.width,
      height: viewport.height,
    };
  }

  /**
   * Convert all PDF pages to images
   */
  async convertAllPages(
    pdfUrl: string,
    scale: number = 2.0,
    onProgress?: (current: number, total: number) => void
  ): Promise<PDFPageImage[]> {
    const pdf = await this.loadPDF(pdfUrl);
    const totalPages = pdf.numPages;
    const images: PDFPageImage[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const image = await this.convertPageToImage(pdf, i, scale);
      images.push(image);

      if (onProgress) {
        onProgress(i, totalPages);
      }
    }

    return images;
  }

  /**
   * Get PDF info (page count, etc.)
   */
  async getPDFInfo(pdfUrl: string): Promise<{ numPages: number }> {
    const pdf = await this.loadPDF(pdfUrl);
    return {
      numPages: pdf.numPages,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.pdfCache.clear();
  }
}

// Export singleton instance
export const pdfConverter = new PDFToImageConverter();
