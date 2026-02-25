/**
 * Scan QR Screen — Scans a worker's QR code to link shared hours.
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { QRScanner } from '@onsite/ui/native';

export default function ScanQRScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleScan = async (data: string) => {
    if (loading) return;
    setLoading(true);

    try {
      const parsed = JSON.parse(data);

      // Timekeeper QR codes contain a pending_token for access_grants
      if (!parsed.token) {
        throw new Error('Invalid QR code');
      }

      // TODO: Call lookup_pending_token() and create access_grant
      Alert.alert(
        'QR Code Scanned',
        `Token: ${parsed.token.substring(0, 8)}...`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not a valid worker share code.',
        [{ text: 'Try Again' }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <QRScanner
      onScan={handleScan}
      title="Scan QR Code"
      subtitle="Scan a worker's QR code to view their shared hours"
      loading={loading}
      loadingText="Verifying..."
      onClose={() => router.back()}
      instructionText="Ask the worker to share their QR code from the Timekeeper app"
    />
  );
}
