import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import type { MaterialRequest } from '@onsite/shared';
import { getMaterialRequests } from '@onsite/shared';
import { formatDistanceToNow } from 'date-fns';

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

export default function RequestsList() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  async function loadRequests() {
    try {
      // Use shared function - operator sees all active requests
      const { data, error } = await getMaterialRequests(supabase, {});

      if (error) {
        console.error('Error loading requests:', error);
        return;
      }

      // Filter to active statuses only (pending, acknowledged, in_transit)
      const activeStatuses = ['pending', 'acknowledged', 'in_transit'];
      const activeRequests = (data || []).filter(
        req => activeStatuses.includes(req.status)
      );

      // Transform to include lot_number and site_name at top level
      const transformedData = activeRequests.map(req => ({
        ...req,
        lot_number: (req as any).house?.lot_number || null,
        site_name: (req as any).site?.name || null,
      }));

      setRequests(transformedData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const renderItem = ({ item }: { item: MaterialRequest }) => (
    <Link href={`/requests/${item.id}`} asChild>
      <TouchableOpacity style={styles.card}>
        {/* Urgency bar */}
        <View
          style={[
            styles.urgencyBar,
            { backgroundColor: URGENCY_COLORS[item.urgency_level] }
          ]}
        />

        <View style={styles.cardContent}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <Text style={styles.materialName}>{item.material_name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${STATUS_COLORS[item.status]}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: STATUS_COLORS[item.status] }
              ]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Quantity */}
          <Text style={styles.quantity}>
            {item.quantity} {item.unit}
          </Text>

          {/* Location */}
          <Text style={styles.location}>
            {item.site_name} {item.lot_number ? `• Lot ${item.lot_number}` : ''}
            {item.delivery_location ? ` • ${item.delivery_location}` : ''}
          </Text>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.requester}>
              By {item.requested_by_name}
            </Text>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>
          </View>

          {/* Urgency badge */}
          <View style={[
            styles.urgencyBadge,
            { backgroundColor: `${URGENCY_COLORS[item.urgency_level]}20` }
          ]}>
            <View style={[
              styles.urgencyDot,
              { backgroundColor: URGENCY_COLORS[item.urgency_level] }
            ]} />
            <Text style={[
              styles.urgencyText,
              { color: URGENCY_COLORS[item.urgency_level] }
            ]}>
              {item.urgency_level.toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={requests}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Active Requests</Text>
          <Text style={styles.emptySubtitle}>
            Pull down to refresh
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  urgencyBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  quantity: {
    fontSize: 14,
    color: '#86868B',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#86868B',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requester: {
    fontSize: 12,
    color: '#86868B',
  },
  time: {
    fontSize: 12,
    color: '#86868B',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#86868B',
  },
});
