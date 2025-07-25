/**
 * Secure PDF Generation Utilities
 * 
 * This module provides secure implementations for html2canvas and jsPDF
 * with XSS protection, CORS handling, and input sanitization.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import DOMPurify from 'dompurify';

// Security configuration for html2canvas
const SECURE_HTML2CANVAS_OPTIONS = {
  useCORS: true,                    // Enable CORS for remote images
  allowTaint: false,                // Prevent tainted canvas
  background: '#ffffff',            // Set safe background color
  logging: false,                   // Disable debug logging in production
  width: undefined,                // Let html2canvas determine optimal width
  height: undefined,               // Let html2canvas determine optimal height
  x: 0,
  y: 0,
  scrollX: 0,
  scrollY: 0,
  windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
  windowHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
} as const;

// Image loading timeout (separate constant since it's not part of html2canvas options)
const IMAGE_LOAD_TIMEOUT = 15000;

// DOMPurify configuration for HTML sanitization
const DOMPURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'ul', 'ol', 'li', 'br', 'strong', 'em', 'b', 'i',
    'img' // Allow images but they'll be sanitized
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'data-*', 
    'src', 'alt', 'width', 'height' // For images
  ],
  ALLOW_DATA_ATTR: true,           // Allow data attributes (needed for styling)
  FORBID_TAGS: [
    'script', 'object', 'embed', 'applet', 'iframe',
    'form', 'input', 'button', 'textarea', 'select',
    'link', 'meta', 'base'
  ],
  SAFE_FOR_TEMPLATES: true,        // Extra safety for template engines
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (htmlContent: string): string => {
  return DOMPurify.sanitize(htmlContent, DOMPURIFY_CONFIG);
};

/**
 * Loads an image with CORS support
 */
export const loadImageWithCORS = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';  // Enable CORS
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error(`Failed to load image: ${src}`));
    
    // Add timeout to prevent hanging
    setTimeout(() => {
      reject(new Error(`Image load timeout: ${src}`));
    }, IMAGE_LOAD_TIMEOUT);
    
    img.src = src;
  });
};

/**
 * Validates that an element is safe for PDF generation
 */
const validateElement = (element: HTMLElement): void => {
  if (!element) {
    throw new Error('Element is required for PDF generation');
  }
  
  if (element.nodeType !== Node.ELEMENT_NODE) {
    throw new Error('Provided node is not a valid HTML element');
  }
  
  // Check for potentially dangerous content
  const scripts = element.querySelectorAll('script, object, embed, iframe');
  if (scripts.length > 0) {
    console.warn('Potentially dangerous elements found and will be sanitized');
  }
};

/**
 * Prepares an element for secure PDF generation
 */
const prepareElementForCapture = (element: HTMLElement): HTMLElement => {
  validateElement(element);
  
  // Clone the element to avoid modifying the original
  const clonedElement = element.cloneNode(true) as HTMLElement;
  
  // Sanitize the HTML content
  clonedElement.innerHTML = sanitizeHTML(clonedElement.innerHTML);
  
  // Ensure all images have proper CORS attributes
  const images = clonedElement.querySelectorAll('img');
  images.forEach(img => {
    img.crossOrigin = 'anonymous';
    
    // Remove any potentially dangerous attributes
    img.removeAttribute('onerror');
    img.removeAttribute('onload');
  });
  
  return clonedElement;
};

/**
 * Interface for PDF generation options
 */
export interface SecurePDFOptions {
  filename?: string;
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  imageQuality?: number;
  html2canvasOptions?: Partial<Parameters<typeof html2canvas>[1]>;
}

/**
 * Generates a PDF from an HTML element with security measures
 */
export const generateSecurePDF = async (
  element: HTMLElement,
  options: SecurePDFOptions = {}
): Promise<void> => {
  const {
    filename = 'document.pdf',
    format = 'a4',
    orientation = 'portrait',
    margin = 10,
    imageQuality = 0.92,
    html2canvasOptions = {}
  } = options;
  
  try {
    // Validate and prepare the element
    const preparedElement = prepareElementForCapture(element);
    
    // Merge security options with user options (security options take precedence)
    const canvasOptions: any = {
      ...html2canvasOptions,
      ...SECURE_HTML2CANVAS_OPTIONS,
      background: (html2canvasOptions as any)?.background || '#ffffff',
    };
    
    // Capture the element as canvas
    console.log('Capturing element as canvas...');
    const canvas = await html2canvas(preparedElement, canvasOptions);
    
    // Calculate PDF dimensions
    const imgWidth = format === 'a4' ? 210 : 216; // mm
    const pageHeight = format === 'a4' ? 297 : 279; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const contentHeight = imgHeight - (margin * 2);
    const pageContentHeight = pageHeight - (margin * 2);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: format.toLowerCase() as any
    });
    
    let position = margin;
    let remainingHeight = contentHeight;
    
    // Add the image to PDF (handle multi-page if needed)
    const imgData = canvas.toDataURL('image/png', imageQuality);
    
    while (remainingHeight > 0) {
      const currentPageHeight = Math.min(remainingHeight, pageContentHeight);
      const sourceY = contentHeight - remainingHeight;
      const sourceHeight = currentPageHeight;
      
      // Add image to current page
      pdf.addImage(
        imgData,
        'PNG',
        margin,
        position,
        imgWidth - (margin * 2),
        sourceHeight,
        undefined,
        'FAST'
      );
      
      remainingHeight -= pageContentHeight;
      
      if (remainingHeight > 0) {
        pdf.addPage();
        position = margin;
      }
    }
    
    // Save the PDF
    console.log('Saving PDF...');
    pdf.save(filename);
    
  } catch (error) {
    console.error('Secure PDF generation failed:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('tainted')) {
        throw new Error('PDF generation failed due to CORS restrictions. Please ensure all images have proper CORS headers.');
      } else if (error.message.includes('timeout')) {
        throw new Error('PDF generation failed due to timeout. Please try again or reduce the content size.');
      } else {
        throw new Error(`PDF generation failed: ${error.message}`);
      }
    } else {
      throw new Error('PDF generation failed due to an unknown error.');
    }
  }
};

/**
 * Generates a secure PDF from a React component
 * 
 * Usage example:
 * ```tsx
 * import { generateSecurePDFFromRef } from './utils/securePDFGenerator';
 * 
 * const MyComponent = () => {
 *   const elementRef = useRef<HTMLDivElement>(null);
 *   
 *   const handleDownloadPDF = async () => {
 *     if (elementRef.current) {
 *       await generateSecurePDFFromRef(elementRef, {
 *         filename: 'my-report.pdf',
 *         format: 'a4'
 *       });
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <div ref={elementRef}>Content to convert to PDF</div>
 *       <button onClick={handleDownloadPDF}>Download PDF</button>
 *     </div>
 *   );
 * };
 * ```
 */
export const generateSecurePDFFromRef = async (
  elementRef: React.RefObject<HTMLElement>,
  options: SecurePDFOptions = {}
): Promise<void> => {
  if (!elementRef.current) {
    throw new Error('Element reference is not available');
  }
  
  return generateSecurePDF(elementRef.current, options);
};

/**
 * Utility to check if CORS is properly configured for an image URL
 */
export const checkImageCORS = async (imageUrl: string): Promise<boolean> => {
  try {
    await loadImageWithCORS(imageUrl);
    return true;
  } catch (error) {
    console.warn(`CORS check failed for image: ${imageUrl}`, error);
    return false;
  }
};

/**
 * Configuration helper for setting up secure image sources
 */
export const configureSecureImageSources = (allowedDomains: string[] = []) => {
  // Add current domain to allowed domains
  if (typeof window !== 'undefined') {
    allowedDomains.push(window.location.origin);
  }
  
  return {
    isAllowedSource: (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return allowedDomains.some(domain => 
          urlObj.origin === domain || urlObj.href.startsWith('data:')
        );
      } catch {
        return false;
      }
    },
    addCORSHeaders: (img: HTMLImageElement) => {
      img.crossOrigin = 'anonymous';
    }
  };
};

export default {
  generateSecurePDF,
  generateSecurePDFFromRef,
  sanitizeHTML,
  loadImageWithCORS,
  checkImageCORS,
  configureSecureImageSources
};
