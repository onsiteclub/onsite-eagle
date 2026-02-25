/**
 * OnSite Export Branding
 *
 * Derives RGB color tuples from @onsite/tokens for use in PDF/Excel generation.
 * Single source of truth for all export visual identity.
 */

import type { RGB } from './types';

/** Convert hex color to RGB tuple */
export function hexToRGB(hex: string): RGB {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

/**
 * OnSite brand colors as RGB tuples.
 *
 * Derived from @onsite/tokens Enterprise Theme v3.
 * Use these instead of hardcoding RGB values in export code.
 */
export const BRAND_COLORS = {
  // Brand accent — muted amber (#C58B1B)
  primary: [197, 139, 27] as RGB,
  primarySoft: [255, 243, 214] as RGB,   // #FFF3D6
  primaryLine: [242, 210, 139] as RGB,   // #F2D28B

  // Utility green (#0F766E)
  accent: [15, 118, 110] as RGB,
  accentLight: [20, 184, 166] as RGB,    // #14B8A6
  accentSoft: [209, 250, 229] as RGB,    // #D1FAE5

  // Text
  text: [16, 24, 40] as RGB,             // #101828
  textSecondary: [102, 112, 133] as RGB, // #667085
  textMuted: [152, 162, 179] as RGB,     // #98A2B3

  // Surfaces
  white: [255, 255, 255] as RGB,
  surface: [255, 255, 255] as RGB,
  surfaceMuted: [246, 247, 249] as RGB,  // #F6F7F9
  surfaceLight: [242, 244, 247] as RGB,  // #F2F4F7

  // Borders
  border: [227, 231, 238] as RGB,        // #E3E7EE

  // Feedback
  error: [220, 38, 38] as RGB,           // #DC2626
  success: [15, 118, 110] as RGB,        // #0F766E
  warning: [197, 139, 27] as RGB,        // #C58B1B
  info: [59, 130, 246] as RGB,           // #3B82F6

  // Positive/Negative change indicators
  positive: [34, 197, 94] as RGB,        // green-500
  negative: [239, 68, 68] as RGB,        // red-500
} as const;

/**
 * Dark theme variant for analytics/intelligence PDFs.
 *
 * Based on zinc palette used by ARGUS.
 */
export const BRAND_COLORS_DARK = {
  background: [24, 24, 27] as RGB,       // zinc-900
  backgroundDeep: [9, 9, 11] as RGB,     // zinc-950
  surface: [39, 39, 42] as RGB,          // zinc-800
  text: [228, 228, 231] as RGB,          // zinc-200
  textSecondary: [161, 161, 170] as RGB, // zinc-400
  textMuted: [113, 113, 122] as RGB,     // zinc-500
  accent: [249, 115, 22] as RGB,         // orange-500 (ARGUS accent)
  alert: [234, 179, 8] as RGB,           // yellow
  alertText: [253, 224, 71] as RGB,      // yellow-300
} as const;

/** Sanitize a string for use as filename */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/** Format a date for report headers */
export function formatReportDate(date: Date, locale: string = 'en-CA'): string {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format minutes as "Xh Ymin" */
export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
}
