import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { sendMessage } from '@onsite/timeline/data';
import type { MaterialRequest } from '@onsite/shared';

export default function DeliverConfirmation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [operatorName, setOperatorName] = useState('Operator');
  const [operatorId, setOperatorId] = useState<string | null>(null);

  useEffect(() => {
    loadOperator();
    loadRequest();
  }, [id]);

  async function loadOperator() {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setOperatorId(data.user.id);
      const { data: profile } = await supabase
        .from('core_profiles')
        .select('full_name')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profile?.full_name) setOperatorName(profile.full_name);
    }
  }

  async function loadRequest() {
    try {
      const { data, error } = await supabase
        .from('egl_material_requests')
        .select(`
          *,
          house:egl_houses(lot_number),
          site:egl_sites(name)
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

  async function confirmDelivery() {
    if (!request) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('egl_material_requests')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_notes: deliveryNotes.trim() || null,
          delivered_by_name: operatorName,
        })
        .eq('id', request.id);

      if (error) {
        Alert.alert('Error', 'Failed to confirm delivery');
        console.error('Error:', error);
        return;
      }

      // Create house-level timeline event
      if (request.house_id) {
        await supabase.from('egl_timeline').insert({
          house_id: request.house_id,
          event_type: 'note',
          title: `Material Delivered: ${request.material_name}`,
          description: `${request.quantity} ${request.unit} delivered by ${operatorName}${deliveryNotes ? `. Notes: ${deliveryNotes}` : ''}`,
          source: 'operator_app',
          created_by: operatorId,
        });
      }

      // Post site-level timeline message so all team members see it
      if (request.site_id) {
        const notesSuffix = deliveryNotes ? ` — ${deliveryNotes}` : '';
        await sendMessage(supabase as never, {
          site_id: request.site_id,
          house_id: request.house_id || undefined,
          sender_type: 'operator',
          sender_id: operatorId || undefined,
          sender_name: operatorName,
          content: `Delivered ${request.quantity} ${request.unit} of ${request.material_name}${request.lot_number ? ` to Lot ${request.lot_number}` : ''}${notesSuffix}`,
          source_app: 'operator',
        });
      }

      Alert.alert(
        'Success',
        'Delivery confirmed successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F766E" />
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
      {/* Delivery Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.checkIcon}>
          <Text style={styles.checkEmoji}>📦</Text>
        </View>
        <Text style={styles.summaryTitle}>Confirm Delivery</Text>
        <Text style={styles.materialName}>{request.material_name}</Text>
        <Text style={styles.quantity}>{request.quantity} {request.unit}</Text>
        <Text style={styles.location}>
          {request.site_name}
          {request.lot_number ? ` • Lot ${request.lot_number}` : ''}
        </Text>
      </View>

      {/* Delivery Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any notes about the delivery..."
          placeholderTextColor="#86868B"
          value={deliveryNotes}
          onChangeText={setDeliveryNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={confirmDelivery}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  checkIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkEmoji: {
    fontSize: 40,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  materialName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 16,
    color: '#86868B',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#86868B',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#86868B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1D1D1F',
    minHeight: 120,
  },
  actions: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#16A34A',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  cancelButtonText: {
    color: '#1D1D1F',
    fontSize: 17,
    fontWeight: '600',
  },
});
