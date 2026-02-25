/** RGB tuple for jsPDF color functions */
export type RGB = [number, number, number];

/** PDF document configuration */
export interface PDFConfig {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  margin?: number;
}

/** Brand header options */
export interface BrandHeaderOptions {
  title: string;
  subtitle?: string;
  date?: Date;
  /** Header background color (defaults to brand primary) */
  backgroundColor?: RGB;
  /** Title text color (defaults to white) */
  titleColor?: RGB;
}

/** Brand footer options */
export interface BrandFooterOptions {
  text?: string;
  /** Show page numbers */
  showPageNumbers?: boolean;
}

/** Stats box for PDF reports */
export interface StatBox {
  label: string;
  value: string;
}

/** Excel sheet column definition */
export interface ColumnDef {
  /** Header label */
  header: string;
  /** Key in data object */
  key: string;
  /** Column width in characters */
  width?: number;
}

/** Text report section */
export interface TextReportSection {
  title?: string;
  lines: string[];
}
