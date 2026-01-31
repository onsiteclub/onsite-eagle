import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import type { House, TimelineEvent } from '@onsite/shared';
import { getStatusColor, getStatusLabel, CONSTRUCTION_PHASES } from '@onsite/shared';

export default function HouseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadHouseData();
    }
  }, [id]);

  async function loadHouseData() {
    try {
      // Load house
      const { data: houseData } = await supabase
        .from('houses')
        .select('*')
        .eq('id', id)
        .single();

      if (houseData) {
        setHouse(houseData);
      }

      // Load timeline
      const { data: timelineData } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('house_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (timelineData) {
        setTimeline(timelineData);
      }
    } catch (error) {
      console.error('Error loading house:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>House not found</Text>
      </View>
    );
  }

  const currentPhase = CONSTRUCTION_PHASES[house.current_phase] || CONSTRUCTION_PHASES[0];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.lotNumber}>Lot {house.lot_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(house.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(house.status)}</Text>
          </View>
        </View>
        {house.address && <Text style={styles.address}>{house.address}</Text>}
      </View>

      {/* Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressPhase}>{currentPhase.name}</Text>
            <Text style={styles.progressPercent}>{house.progress_percentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${house.progress_percentage}%` }]}
            />
          </View>
          <Text style={styles.progressDescription}>{currentPhase.description}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          <Link href="/camera" asChild>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={styles.actionText}>Take Photo</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={styles.actionText}>Report Issue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Add Note</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {timeline.length === 0 ? (
          <Text style={styles.emptyTimeline}>No activity yet</Text>
        ) : (
          timeline.map((event) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                {event.description && (
                  <Text style={styles.timelineDescription}>{event.description}</Text>
                )}
                <Text style={styles.timelineDate}>
                  {new Date(event.created_at).toLocaleDateString()}
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
    backgroundColor: '#111827',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressPhase: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyTimeline: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
  },
  timelineTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  timelineDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  timelineDate: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 8,
  },
});
