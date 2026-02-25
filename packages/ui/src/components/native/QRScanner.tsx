/**
 * QRScanner — Shared QR code scanner for all Expo apps.
 *
 * Wraps expo-camera CameraView with a standardized scanner frame (corner
 * decorations, dark overlay, permission request screen).
 *
 * Business logic stays in the app — this component only provides the UI
 * and forwards scanned data via the `onScan` callback.
 *
 * Usage:
 *   import { QRScanner } from '@onsite/ui/native'
 *
 *   <QRScanner
 *     onScan={(data) => handleQRData(data)}
 *     title="Scan Lot QR Code"
 *     subtitle="Point at the QR code on the lot marker"
 *   />
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { colors } from '@onsite/tokens';

export interface QRScannerProps {
  /** Called with raw QR data string when a code is scanned */
  onScan: (data: string) => void;
  /** Header title */
  title?: string;
  /** Header subtitle */
  subtitle?: string;
  /** Permission screen title */
  permissionTitle?: string;
  /** Permission screen description */
  permissionText?: string;
  /** Permission button label */
  permissionButtonText?: string;
  /** Corner bracket color (default: accent green) */
  cornerColor?: string;
  /** Show loading overlay inside scanner frame */
  loading?: boolean;
  /** Text shown below the loading spinner */
  loadingText?: string;
  /** Footer instruction text */
  instructionText?: string;
  /** Instruction icon (emoji or text) */
  instructionIcon?: string;
  /** Called when user taps cancel/close */
  onClose?: () => void;
  /** Label for the close/cancel button. Defaults to "Cancel" */
  closeLabel?: string;
}

export function QRScanner({
  onScan,
  title = 'Scan QR Code',
  subtitle,
  permissionTitle = 'Camera Access Required',
  permissionText = 'Point your camera at a QR code to scan it',
  permissionButtonText = 'Allow Camera',
  cornerColor = colors.accent,
  loading = false,
  loadingText = 'Processing...',
  instructionText,
  instructionIcon = '\u{1F4A1}',
  onClose,
  closeLabel = 'Cancel',
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanned || loading) return;
      setScanned(true);
      onScan(data);
    },
    [scanned, loading, onScan],
  );

  const handleRescan = useCallback(() => {
    setScanned(false);
  }, []);

  // Still loading permission status
  if (!permission) {
    return <View style={styles.container} />;
  }

  // Permission not granted — show request screen
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>{'\u{1F4F7}'}</Text>
        <Text style={styles.permissionTitle}>{permissionTitle}</Text>
        <Text style={styles.permissionText}>{permissionText}</Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: cornerColor }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>{permissionButtonText}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera active
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            ) : null}
          </View>

          {/* Scanner Frame */}
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: cornerColor }]} />

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={cornerColor} />
                <Text style={styles.loadingText}>{loadingText}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              {onClose ? (
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeText}>{closeLabel}</Text>
                </TouchableOpacity>
              ) : null}

              {scanned && !loading ? (
                <TouchableOpacity style={styles.rescanButton} onPress={handleRescan}>
                  <Text style={styles.rescanText}>Scan Again</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {instructionText ? (
              <View style={styles.instructions}>
                <Text style={styles.instructionIconText}>{instructionIcon}</Text>
                <Text style={styles.instructionText}>{instructionText}</Text>
              </View>
            ) : null}
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

  // Permission screen
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
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Camera
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    paddingTop: 60,
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

  // Scanner frame
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

  // Loading
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

  // Footer
  footer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
  },
  rescanButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanText: {
    color: '#fff',
    fontSize: 16,
  },

  // Instructions
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  instructionIconText: {
    fontSize: 16,
  },
  instructionText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    flex: 1,
  },
});
