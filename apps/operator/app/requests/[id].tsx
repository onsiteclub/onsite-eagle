import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import type { MaterialRequest, MaterialRequestStatus } from '@onsite/shared';
import { updateRequestStatus } from '@onsite/shared';
import { formatDistanceToNow, format } from 'date-fns';

const URGENCY_COLORS = {
  critical: '#FF3B30',
  high: '#FF9500',
  medium: '#FFCC00',
  low: '#8E8E93',
};

const STATUS_COLORS = {
  pending: '#FF9500',
  acknowledged: '#007AFF',
  in_transit: '#5856D6',
  delivered: '#34C759',
  cancelled: '#8E8E93',
};

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [request, setRequest] = useState<MaterialRequest | null>(null);

  useEffect(() => {
    loadRequest();
  }, [id]);

  async function loadRequest() {
    try {
      const { data, error } = await supabase
        .from('egl_material_requests')
        .select(`
          *,
          house:egl_houses(lot_number, address),
          site:egl_sites(name, address)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading request:', error);
        return;
      }

      setRequest({
        ...data,
        lot_number: data.house?.lot_number,
        site_name: data.site?.name,
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(newStatus: MaterialRequestStatus) {
    if (!request) return;

    // For delivery, navigate to confirmation screen
    if (newStatus === 'delivered') {
      router.push(`/deliver/${request.id}`);
      return;
    }

    setUpdating(true);

    try {
      // Use shared function to update status (handles timestamps automatically)
      const { error } = await updateRequestStatus(supabase, request.id, {
        status: newStatus
      });

      if (error) {
        Alert.alert('Error', 'Failed to update status');
        console.error('Error:', error);
      } else {
        loadRequest();
      }
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Request not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={[
            styles.urgencyBadge,
            { backgroundColor: `${URGENCY_COLORS[request.urgency_level]}20` }
          ]}>
            <View style={[
              styles.urgencyDot,
              { backgroundColor: URGENCY_COLORS[request.urgency_level] }
            ]} />
            <Text style={[
              styles.urgencyText,
              { color: URGENCY_COLORS[request.urgency_level] }
            ]}>
              {request.urgency_level.toUpperCase()}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: `${STATUS_COLORS[request.status]}20` }
          ]}>
            <Text style={[
              styles.statusText,
              { color: STATUS_COLORS[request.status] }
            ]}>
              {request.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.materialName}>{request.material_name}</Text>
        <Text style={styles.quantity}>{request.quantity} {request.unit}</Text>
      </View>

      {/* Location Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Location</Text>
        <View style={styles.infoCard}>
          <Text style={styles.siteName}>{request.site_name}</Text>
          {request.lot_number && (
            <Text style={styles.lotNumber}>Lot {request.lot_number}</Text>
          )}
          {request.delivery_location && (
            <Text style={styles.deliveryLocation}>{request.delivery_location}</Text>
          )}
        </View>
      </View>

      {/* Requester Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Requested By</Text>
        <View style={styles.infoCard}>
          <Text style={styles.requesterName}>{request.requested_by_name}</Text>
          {request.requested_by_role && (
            <Text style={styles.requesterRole}>{request.requested_by_role}</Text>
          )}
          <Text style={styles.requestTime}>
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {request.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.infoCard}>
            <Text style={styles.notes}>{request.notes}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {request.status !== 'delivered' && request.status !== 'cancelled' && (
        <View style={styles.actions}>
          {request.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => handleStatusUpdate('acknowledged')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Acknowledge</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  Alert.alert(
                    'Cancel Request',
                    'Are you sure you want to cancel this request?',
                    [
                      { text: 'No', style: 'cancel' },
                      { text: 'Yes', onPress: () => handleStatusUpdate('cancelled') }
                    ]
                  );
                }}
                disabled={updating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {request.status === 'acknowledged' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleStatusUpdate('in_transit')}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Mark In Transit</Text>
              )}
            </TouchableOpacity>
          )}

          {request.status === 'in_transit' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.successButton]}
              onPress={() => handleStatusUpdate('delivered')}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.successButtonText}>Complete Delivery</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  materialName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 18,
    color: '#86868B',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#86868B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  lotNumber: {
    fontSize: 15,
    color: '#1D1D1F',
    marginTop: 4,
  },
  deliveryLocation: {
    fontSize: 14,
    color: '#86868B',
    marginTop: 8,
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  requesterRole: {
    fontSize: 14,
    color: '#86868B',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  requestTime: {
    fontSize: 13,
    color: '#86868B',
    marginTop: 8,
  },
  notes: {
    fontSize: 15,
    color: '#1D1D1F',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
