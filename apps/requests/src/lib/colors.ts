/**
 * Centralized color constants for request status and urgency.
 * Uses CSS custom properties defined in globals.css @theme block.
 *
 * These replace the hardcoded hex values previously duplicated
 * across QueueCard.tsx and RequestCard.tsx.
 */

/** Left border color for request cards, keyed by status */
export const STATUS_BORDER: Record<string, string> = {
  requested: "var(--color-urgency-critical)",
  acknowledged: "var(--color-status-requested)",
  in_transit: "var(--color-status-in-transit)",
  delivered: "var(--color-border)",
  problem: "var(--color-status-problem)",
  cancelled: "var(--color-text-muted)",
};

/** Urgency dot/indicator color */
export const URGENCY_COLORS: Record<string, string> = {
  critical: "var(--color-urgency-critical)",
  high: "var(--color-urgency-high)",
  medium: "var(--color-urgency-medium)",
  low: "var(--color-urgency-low)",
};
