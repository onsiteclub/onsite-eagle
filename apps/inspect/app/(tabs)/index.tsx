import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import type { House } from '@onsite/shared';
import { getStatusColor, CONSTRUCTION_PHASES } from '@onsite/shared';

export default function AgendaScreen() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyHouses();
  }, []);

  async function loadMyHouses() {
    try {
      // TODO: Filter by worker ID when auth is implemented
      const { data } = await supabase
        .from('houses')
        .select('*')
        .in('status', ['in_progress', 'not_started'])
        .order('updated_at', { ascending: false });

      if (data) {
        setHouses(data);
      }
    } catch (error) {
      console.error('Error loading houses:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={houses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <HouseCard house={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>Nenhuma casa atribuída</Text>
            <Text style={styles.emptySubtext}>
              Aguarde seu supervisor atribuir casas para você
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Suas Casas</Text>
            <Text style={styles.headerSubtitle}>
              {houses.length} {houses.length === 1 ? 'casa' : 'casas'} em andamento
            </Text>
          </View>
        }
      />
    </View>
  );
}

function HouseCard({ house }: { house: House }) {
  const currentPhase = CONSTRUCTION_PHASES[house.current_phase] || CONSTRUCTION_PHASES[0];

  return (
    <Link href={`/house/${house.id}`} asChild>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(house.status) }]} />
          <Text style={styles.lotNumber}>Lote {house.lot_number}</Text>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{house.progress_percentage}%</Text>
          </View>
        </View>

        {house.address && (
          <Text style={styles.address}>{house.address}</Text>
        )}

        <View style={styles.phaseInfo}>
          <Text style={styles.phaseLabel}>Fase Atual:</Text>
          <Text style={styles.phaseName}>{currentPhase.name}</Text>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${house.progress_percentage}%` }]} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>Toque para ver detalhes →</Text>
        </View>
      </TouchableOpacity>
    </Link>
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
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  lotNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  progressBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
  },
  address: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 12,
  },
  phaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseLabel: {
    color: '#6B7280',
    fontSize: 13,
    marginRight: 8,
  },
  phaseName: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tapHint: {
    color: '#6B7280',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    padding: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
