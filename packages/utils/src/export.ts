// ============================================
// EXPORT UTILITIES
// ============================================

/**
 * Converts an array of objects to CSV string
 */
export function toCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const csvHeaders = keys.join(',');

  const csvRows = data.map(row => {
    return keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Downloads content as a file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads data as CSV file
 */
export function downloadCSV(data: any[], filename: string, headers?: string[]): void {
  const csv = toCSV(data, headers);
  downloadFile(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv');
}
