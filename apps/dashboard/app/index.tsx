import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import type { House, Site } from '@onsite/shared';
import { getStatusColor, getStatusLabel } from '@onsite/shared';

export default function HomeScreen() {
  const [houses, setHouses] = useState<House[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load first site
      const { data: sites } = await supabase
        .from('sites')
        .select('*')
        .limit(1);

      if (sites && sites.length > 0) {
        setSite(sites[0]);

        // Load houses for this site
        const { data: housesData } = await supabase
          .from('houses')
          .select('*')
          .eq('site_id', sites[0].id)
          .order('lot_number');

        if (housesData) {
          setHouses(housesData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {site && (
        <View style={styles.header}>
          <Text style={styles.siteName}>{site.name}</Text>
          <Text style={styles.siteAddress}>{site.address}</Text>
        </View>
      )}

      <View style={styles.stats}>
        <StatCard
          label="Total"
          value={houses.length}
          color="#6B7280"
        />
        <StatCard
          label="In Progress"
          value={houses.filter(h => h.status === 'in_progress').length}
          color="#FCD34D"
        />
        <StatCard
          label="Completed"
          value={houses.filter(h => h.status === 'completed').length}
          color="#10B981"
        />
      </View>

      <FlatList
        data={houses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Link href={`/house/${item.id}`} asChild>
            <TouchableOpacity style={styles.houseCard}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <View style={styles.houseInfo}>
                <Text style={styles.lotNumber}>Lot {item.lot_number}</Text>
                <Text style={styles.houseStatus}>{getStatusLabel(item.status)}</Text>
              </View>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{item.progress_percentage}%</Text>
              </View>
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No houses found</Text>
            <Text style={styles.emptySubtext}>Scan a plan to get started</Text>
          </View>
        }
      />

      <Link href="/camera" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
  },
  header: {
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  siteName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  siteAddress: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  houseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  houseInfo: {
    flex: 1,
  },
  lotNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  houseStatus: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  progressContainer: {
    backgroundColor: '#374151',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});
