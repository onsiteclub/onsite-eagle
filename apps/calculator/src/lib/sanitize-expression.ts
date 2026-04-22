// Shared expression sanitization logic used on both the client (before compute)
// and the voice API (after GPT). Keeping it in one place avoids the two sides
// drifting apart — GPT occasionally emits `10.000` or `10,000` for ten-thousand
// and the engine can't parse that.

/**
 * Removes thousand separators (`.` or `,` followed by exactly 3 digits) and
 * normalizes `N / 100` back to `N%` (GPT sometimes rewrites "por cento" that way).
 * Dot followed by 1-2 digits (e.g. `10.5`) is preserved as a decimal.
 */
export function sanitizeExpression(input: string): string {
  let out = input;
  let prev: string;

  // Strip comma thousands separators: "10,000" → "10000".
  do {
    prev = out;
    out = out.replace(/(\d),(\d{3})(?=\D|$)/g, '$1$2');
  } while (out !== prev);

  // Strip dot thousands separators: "10.000" → "10000". Preserves "10.5".
  do {
    prev = out;
    out = out.replace(/(\d)\.(\d{3})(?=\D|$)/g, '$1$2');
  } while (out !== prev);

  // "N / 100" → "N%" (GPT sometimes converts "por cento" this way).
  out = out.replace(/(\d+)\s*\/\s*100\b/g, '$1%');

  return out;
}
