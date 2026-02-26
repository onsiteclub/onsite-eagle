/**
 * Lot Detail — Individual lot view with phases, photos, timeline, issues.
 *
 * Equivalent to Monitor's `/site/[id]/lot/[lotId]` page.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '../../../src/lib/supabase';
import StatusBadge from '../../../src/components/StatusBadge';
import PhaseProgress from '../../../src/components/PhaseProgress';
import PhotoGallery from '../../../src/components/PhotoGallery';
import type { House, HouseStatus } from '@onsite/shared';

const ACCENT = '#0F766E';

interface LotPhoto {
  id: string;
  photo_url: string;
  thumbnail_url: string | null;
  phase_id: string | null;
  ai_validation_status: string | null;
  ai_validation_notes: string | null;
  created_at: string;
}

export default function LotDetailScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [house, setHouse] = useState<House | null>(null);
  const [photos, setPhotos] = useState<LotPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!lotId) return;
    try {
      const [houseRes, photosRes] = await Promise.all([
        supabase.from('egl_houses').select('*').eq('id', lotId).single(),
        supabase
          .from('egl_photos')
          .select('*')
          .eq('house_id', lotId)
          .order('created_at', { ascending: false }),
      ]);

      if (houseRes.error) throw houseRes.error;
      setHouse(houseRes.data as House);
      setPhotos((photosRes.data as LotPhoto[]) || []);
    } catch (err) {
      console.error('[lot] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lotId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Lot not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {/* Header Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.lotTitle}>Lot {house.lot_number}</Text>
            <StatusBadge status={(house.status as HouseStatus) || 'not_started'} size="md" />
          </View>

          {house.address && (
            <Text style={styles.address}>{house.address}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{Math.round(house.progress_percentage || 0)}%</Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
            {house.current_phase != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{house.current_phase}</Text>
                <Text style={styles.statLabel}>Phase</Text>
              </View>
            )}
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${house.progress_percentage || 0}%` }]} />
          </View>
        </View>

        {/* Phases */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phases</Text>
          <PhaseProgress houseId={house.id} />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => router.push({
                pathname: '/(app)/camera',
                params: { houseId: house.id, siteId: house.site_id },
              })}
            >
              <Text style={styles.cameraBtnText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          <PhotoGallery photos={photos} screenWidth={width} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lotTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#101828',
  },
  address: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 12,
  },
  cameraBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: ACCENT,
    marginBottom: 12,
  },
  cameraBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
