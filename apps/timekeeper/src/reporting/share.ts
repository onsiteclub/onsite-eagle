/**
 * Share — Generate PDF from HTML and share via system picker.
 *
 * Uses expo-print for HTML → PDF conversion, expo-sharing for the share sheet.
 * Fallback: plain text share if expo-print is unavailable.
 *
 * Spec: 08-REPORTS.md "reporting/share.ts"
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';
import { logger } from '@onsite/logger';

/**
 * Generate a PDF from HTML and open the system share picker.
 */
export async function sharePdf(html: string, filename: string): Promise<void> {
  try {
    // Generate PDF from HTML
    const { uri } = await Print.printToFileAsync({ html });

    // Move to a location with a proper filename
    const dest = `${FileSystem.documentDirectory}${filename}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: dest });

    // Share via system picker
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(dest, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Timesheet',
      });
    } else {
      // Fallback: try RN Share with file URI
      await Share.share({ url: dest });
    }

    logger.info('REPORT', 'PDF shared', { filename });
  } catch (error) {
    logger.error('REPORT', 'PDF share failed', { error: String(error) });
    throw error;
  }
}

/**
 * Fallback: share plain text via system share sheet.
 */
export async function shareText(text: string, title?: string): Promise<void> {
  try {
    await Share.share({
      message: text,
      title: title || 'OnSite Timesheet',
    });

    logger.info('REPORT', 'Text shared');
  } catch (error) {
    logger.error('REPORT', 'Text share failed', { error: String(error) });
    throw error;
  }
}
