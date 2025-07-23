/**
 * index.js - v2 Components Export
 * 
 * Central export point for all new schema v2 components.
 * These components implement the new flat schema from the OpenAI Vision API.
 */

// Core display components
export { default as ReceiptSummaryCard } from './ReceiptSummaryCard';
export { default as ReceiptVendorInfo } from './ReceiptVendorInfo';
export { default as ReceiptFinancialBreakdown } from './ReceiptFinancialBreakdown';
export { default as ReceiptPerformanceMetrics } from './ReceiptPerformanceMetrics';

// Main page components
export { default as ReceiptListV2 } from './ReceiptListV2';
export { default as ReceiptUploadV2 } from './ReceiptUploadV2';

// New comprehensive components
export { default as ReceiptList } from './ReceiptList';
export { default as ReceiptUploadZone } from './ReceiptUploadZone';
export { default as ReceiptFilterPanel } from './ReceiptFilterPanel';
export { default as ReceiptAnalyticsDashboard } from './ReceiptAnalyticsDashboard';
