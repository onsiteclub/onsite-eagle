import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'
import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../src/lib/supabase'
import type { QRAssignmentData, House, Site } from '@onsite/shared'

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [assignmentData, setAssignmentData] = useState<QRAssignmentData | null>(null)
  const [house, setHouse] = useState<House | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  if (!permission) {
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📱</Text>
        <Text style={styles.permissionTitle}>Escanear QR Code</Text>
        <Text style={styles.permissionText}>
          Aponte a câmera para o QR Code no app do encarregado para receber a atribuição da casa
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || loading) return

    setScanned(true)
    setLoading(true)

    try {
      // Parse QR code data
      const qrData: QRAssignmentData = JSON.parse(data)

      // Validate QR code structure
      if (qrData.type !== 'house_assignment' || qrData.version !== 1) {
        throw new Error('QR Code inválido')
      }

      setAssignmentData(qrData)

      // Fetch house and site details
      const [houseRes, siteRes] = await Promise.all([
        supabase.from('houses').select('*').eq('id', qrData.house_id).single(),
        supabase.from('sites').select('*').eq('id', qrData.site_id).single(),
      ])

      if (houseRes.data) setHouse(houseRes.data)
      if (siteRes.data) setSite(siteRes.data)

      setShowConfirmModal(true)
    } catch (error) {
      console.error('QR scan error:', error)
      Alert.alert(
        'Erro',
        'QR Code inválido ou não reconhecido. Peça ao encarregado para gerar um novo.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptAssignment = async () => {
    if (!assignmentData) return

    setLoading(true)

    try {
      // TODO: Get actual user ID from auth context
      const workerId = 'current-worker-id'

      // Create assignment record
      const { error: assignError } = await supabase.from('house_assignments').insert({
        house_id: assignmentData.house_id,
        worker_id: workerId,
        assigned_by: assignmentData.assigned_by,
        assigned_at: assignmentData.assigned_at,
        expected_start_date: assignmentData.expected_start_date,
        expected_end_date: assignmentData.expected_end_date,
        status: 'accepted',
        plan_urls: assignmentData.plan_urls,
      })

      if (assignError) throw assignError

      // Create timeline event
      await supabase.from('timeline_events').insert({
        house_id: assignmentData.house_id,
        event_type: 'assignment',
        title: 'Casa atribuída ao trabalhador',
        description: `Planta recebida. Prazo: ${format(new Date(assignmentData.expected_end_date), "dd 'de' MMMM", { locale: ptBR })}`,
        source: 'worker_app',
        metadata: {
          assigned_by: assignmentData.assigned_by,
          expected_start: assignmentData.expected_start_date,
          expected_end: assignmentData.expected_end_date,
        },
      })

      Alert.alert(
        'Sucesso! 🎉',
        'Você foi atribuído a esta casa. As plantas estão disponíveis na aba de arquivos.',
        [
          {
            text: 'Ver Casa',
            onPress: () => {
              setShowConfirmModal(false)
              router.replace(`/house/${assignmentData.house_id}`)
            },
          },
        ]
      )
    } catch (error) {
      console.error('Accept assignment error:', error)
      Alert.alert('Erro', 'Não foi possível aceitar a atribuição. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

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
            <Text style={styles.headerTitle}>Escanear QR Code</Text>
            <Text style={styles.headerSubtitle}>
              Aponte para o QR Code do encarregado
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
                <Text style={styles.loadingText}>Processando...</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            {scanned && !loading && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanText}>Escanear Novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Atribuição 🏠</Text>

            {house && site && assignmentData && (
              <ScrollView style={styles.modalScroll}>
                {/* House Info */}
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Casa</Text>
                  <Text style={styles.infoValue}>Lote {house.lot_number}</Text>
                  {house.address && (
                    <Text style={styles.infoSubvalue}>{house.address}</Text>
                  )}
                </View>

                {/* Site Info */}
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Loteamento</Text>
                  <Text style={styles.infoValue}>{site.name}</Text>
                  <Text style={styles.infoSubvalue}>{site.address}</Text>
                </View>

                {/* Dates */}
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Prazos</Text>
                  <View style={styles.datesRow}>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateIcon}>🚀</Text>
                      <Text style={styles.dateLabel}>Início</Text>
                      <Text style={styles.dateValue}>
                        {format(new Date(assignmentData.expected_start_date), 'dd/MM/yyyy')}
                      </Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateIcon}>🎯</Text>
                      <Text style={styles.dateLabel}>Término</Text>
                      <Text style={styles.dateValue}>
                        {format(new Date(assignmentData.expected_end_date), 'dd/MM/yyyy')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Plans */}
                {assignmentData.plan_urls && assignmentData.plan_urls.length > 0 && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Plantas Incluídas</Text>
                    <Text style={styles.plansCount}>
                      📄 {assignmentData.plan_urls.length} arquivo(s) disponível(is)
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => {
                  setShowConfirmModal(false)
                  setScanned(false)
                }}
              >
                <Text style={styles.rejectText}>Recusar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAcceptAssignment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.acceptText}>Aceitar Atribuição</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
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
  },
  permissionText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelText: {
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    maxHeight: 400,
  },
  infoCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoSubvalue: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  dateItem: {
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  dateLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  dateValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  plansCount: {
    color: '#10B981',
    fontSize: 16,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
