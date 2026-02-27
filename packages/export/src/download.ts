/**
 * OnSite Download Utilities
 *
 * Browser-only file download helpers.
 */

/**
 * Download string content as a file in the browser.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Download a Blob as a file in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
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
 * Download an ArrayBuffer/Buffer as a file in the browser.
 */
export function downloadBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const blob = new Blob([buffer as BlobPart], { type: mimeType });
  downloadBlob(blob, filename);
}
