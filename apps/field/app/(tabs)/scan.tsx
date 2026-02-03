import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

interface QRLotData {
  type: 'lot_access';
  version: number;
  lot_id: string;
  site_id: string;
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Point your camera at the QR code on the lot to access its details and documentation
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      // Parse QR code data
      const qrData: QRLotData = JSON.parse(data);

      // Validate QR code structure
      if (qrData.type !== 'lot_access' || !qrData.lot_id) {
        // Try alternative format (house_assignment from inspect app)
        if ((qrData as any).type === 'house_assignment' && (qrData as any).house_id) {
          const lotId = (qrData as any).house_id;
          await verifyAndNavigate(lotId);
          return;
        }
        throw new Error('Invalid QR Code format');
      }

      await verifyAndNavigate(qrData.lot_id);
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not recognized. Please scan a valid lot QR code.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
      setLoading(false);
    }
  };

  const verifyAndNavigate = async (lotId: string) => {
    try {
      // Verify lot exists
      const { data: lot, error } = await supabase
        .from('houses')
        .select('id, lot_number, site_id')
        .eq('id', lotId)
        .single();

      if (error || !lot) {
        throw new Error('Lot not found');
      }

      // Navigate to lot detail page
      router.push(`/lot/${lotId}`);
    } catch (error) {
      Alert.alert(
        'Lot Not Found',
        'This lot could not be found. It may have been removed.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scan Lot QR Code</Text>
            <Text style={styles.headerSubtitle}>
              Point at the QR code on the lot marker
            </Text>
          </View>

          {/* Scanner Frame */}
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Loading lot...</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {scanned && !loading && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanText}>Scan Again</Text>
              </TouchableOpacity>
            )}

            <View style={styles.instructions}>
              <Text style={styles.instructionIcon}>💡</Text>
              <Text style={styles.instructionText}>
                QR codes are placed by inspectors on each lot
              </Text>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 24,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  scannerFrame: {
    width: 280,
    height: 280,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  footer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  rescanButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rescanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  instructionIcon: {
    fontSize: 16,
  },
  instructionText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    flex: 1,
  },
});
