/**
 * Lots grid/list view for site detail.
 *
 * Responsive: 2 columns on tablet, 1 on phone.
 * Shows lot cards with status, progress, and phase info.
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import StatusBadge from './StatusBadge';
import type { House, HouseStatus } from '@onsite/shared';

const ACCENT = '#0F766E';

interface LotsViewProps {
  siteId: string;
  houses: House[];
  onRefresh: () => void;
  onLotPress: (lotId: string) => void;
}

export default function LotsView({ siteId, houses, onRefresh, onLotPress }: LotsViewProps) {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;

  const filteredHouses = useMemo(() => {
    if (!searchQuery.trim()) return houses;
    const q = searchQuery.toLowerCase();
    return houses.filter(
      (h) =>
        h.lot_number?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q)
    );
  }, [houses, searchQuery]);

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  function renderLotCard({ item }: { item: House }) {
    const progress = item.progress_percentage || 0;

    return (
      <TouchableOpacity
        style={[styles.card, isTablet && styles.cardTablet]}
        onPress={() => onLotPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <Text style={styles.lotNumber}>Lot {item.lot_number}</Text>
          <StatusBadge status={(item.status as HouseStatus) || 'not_started'} />
        </View>

        {item.address && (
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        )}

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.progressLabel}>{Math.round(progress)}%</Text>
          {item.current_phase != null && (
            <Text style={styles.phaseLabel}>Phase {item.current_phase}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search lots..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        <Text style={styles.count}>{filteredHouses.length} lots</Text>
      </View>

      {/* List */}
      <FlatList
        key={numColumns}
        data={filteredHouses}
        renderItem={renderLotCard}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No lots found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#101828',
  },
  count: {
    fontSize: 13,
    color: '#667085',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  columnWrapper: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTablet: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lotNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
  },
  address: {
    fontSize: 13,
    color: '#667085',
    marginBottom: 10,
  },
  progressBar: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  phaseLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#667085',
  },
});
