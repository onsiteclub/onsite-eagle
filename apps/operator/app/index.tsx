import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import type { MaterialRequest } from '@onsite/shared';
import { formatDistanceToNow } from 'date-fns';

const URGENCY_COLORS = {
  critical: '#FF3B30',
  high: '#FF9500',
  medium: '#FFCC00',
  low: '#8E8E93',
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    critical: 0,
    pending: 0,
    inTransit: 0,
    deliveredToday: 0,
  });
  const [recentActivity, setRecentActivity] = useState<MaterialRequest[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get all active requests (for now, get all - later filter by operator assignments)
      const { data: requests, error } = await supabase
        .from('egl_material_requests')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading requests:', error);
        return;
      }

      const today = new Date().toDateString();

      setStats({
        critical: requests?.filter(r => r.urgency_level === 'critical' && r.status === 'pending').length || 0,
        pending: requests?.filter(r => r.status === 'pending').length || 0,
        inTransit: requests?.filter(r => r.status === 'in_transit').length || 0,
        deliveredToday: requests?.filter(r =>
          r.status === 'delivered' &&
          r.delivered_at &&
          new Date(r.delivered_at).toDateString() === today
        ).length || 0,
      });

      // Recent activity - last 5 non-pending requests
      setRecentActivity(
        requests?.filter(r => r.status !== 'pending').slice(0, 5) || []
      );
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#FFE5E5' }]}>
          <Text style={[styles.statNumber, { color: URGENCY_COLORS.critical }]}>
            {stats.critical}
          </Text>
          <Text style={[styles.statLabel, { color: URGENCY_COLORS.critical }]}>
            Critical
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.statNumber, { color: URGENCY_COLORS.high }]}>
            {stats.pending}
          </Text>
          <Text style={[styles.statLabel, { color: URGENCY_COLORS.high }]}>
            Pending
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#E8F0FE' }]}>
          <Text style={[styles.statNumber, { color: '#5856D6' }]}>
            {stats.inTransit}
          </Text>
          <Text style={[styles.statLabel, { color: '#5856D6' }]}>
            In Transit
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.statNumber, { color: '#34C759' }]}>
            {stats.deliveredToday}
          </Text>
          <Text style={[styles.statLabel, { color: '#34C759' }]}>
            Today
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Link href="/requests" asChild>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All Requests</Text>
          <Text style={styles.viewAllArrow}>→</Text>
        </TouchableOpacity>
      </Link>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {recentActivity.length === 0 ? (
          <Text style={styles.emptyText}>No recent activity</Text>
        ) : (
          recentActivity.map(item => (
            <View key={item.id} style={styles.activityItem}>
              <View
                style={[
                  styles.activityDot,
                  { backgroundColor: item.status === 'delivered' ? '#34C759' : '#5856D6' }
                ]}
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  {item.status === 'delivered' ? 'Delivered' : 'In Transit'}: {item.material_name}
                </Text>
                <Text style={styles.activityMeta}>
                  {item.quantity} {item.unit} • {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  viewAllButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllArrow: {
    color: '#fff',
    fontSize: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  emptyText: {
    color: '#86868B',
    textAlign: 'center',
    paddingVertical: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  activityMeta: {
    fontSize: 12,
    color: '#86868B',
    marginTop: 2,
  },
});
