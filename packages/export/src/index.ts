// Branding
export {
  BRAND_COLORS,
  BRAND_COLORS_DARK,
  hexToRGB,
  sanitizeFilename,
  formatReportDate,
  formatMinutesToHours,
} from './branding';

// PDF helpers
export {
  createPDF,
  getPageLayout,
  createPageBreakChecker,
  addBrandHeader,
  addDarkHeader,
  addBrandFooter,
  addDarkFooter,
  addStatBoxes,
  addSectionTitle,
} from './pdf';

// Excel helpers
export {
  createWorkbook,
  addDataSheet,
  workbookToBuffer,
  downloadWorkbook,
} from './excel';

// CSV
export { toCSV, downloadCSV } from './csv';

// Text reports
export {
  generateRefCode,
  generateDayReport,
  generateMultiDayReport,
} from './text';

// Download utilities
export { downloadFile, downloadBlob, downloadBuffer } from './download';

// Types
export type {
  RGB,
  PDFConfig,
  BrandHeaderOptions,
  BrandFooterOptions,
  StatBox,
  ColumnDef,
  TextReportSection,
} from './types';
export type { TextSession } from './text';
