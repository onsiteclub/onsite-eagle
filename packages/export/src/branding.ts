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

  // Accent — amber (#C58B1B), same as primary
  accent: [197, 139, 27] as RGB,         // #C58B1B
  accentLight: [224, 184, 77] as RGB,    // #E0B84D
  accentSoft: [255, 243, 214] as RGB,    // #FFF3D6

  // Dark — charcoal for headers/contrast
  dark: [26, 26, 26] as RGB,             // #1A1A1A

  // Text
  text: [26, 26, 26] as RGB,             // #1A1A1A
  textSecondary: [136, 136, 132] as RGB, // #888884
  textMuted: [176, 175, 169] as RGB,     // #B0AFA9

  // Surfaces
  white: [255, 255, 255] as RGB,
  surface: [255, 255, 255] as RGB,
  surfaceMuted: [245, 245, 244] as RGB,  // #F5F5F4
  surfaceLight: [229, 229, 227] as RGB,  // #E5E5E3

  // Borders
  border: [209, 208, 206] as RGB,        // #D1D0CE

  // Feedback
  error: [220, 38, 38] as RGB,           // #DC2626
  success: [22, 163, 74] as RGB,         // #16A34A
  warning: [197, 139, 27] as RGB,        // #C58B1B
  info: [197, 139, 27] as RGB,           // #C58B1B (amber, not blue)

  // Positive/Negative change indicators
  positive: [22, 163, 74] as RGB,        // #16A34A
  negative: [220, 38, 38] as RGB,        // #DC2626
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
