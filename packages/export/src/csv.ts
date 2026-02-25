/**
 * OnSite CSV Export
 *
 * CSV generation and download utilities.
 * Moved from @onsite/utils/export.
 */

/**
 * Convert an array of objects to a CSV string.
 */
export function toCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (!data || data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const csvHeaders = keys.join(',');

  const csvRows = data.map(row => {
    return keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Download data as a CSV file (browser only).
 */
export function downloadCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: string[]
): void {
  const csv = toCSV(data, headers);
  const cleanName = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
