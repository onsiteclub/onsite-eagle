/**
 * Sites List — Main screen after login.
 *
 * Lists all sites the user has access to.
 * Equivalent to Monitor's `/` (HomePage).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import type { Site } from '@onsite/shared';

const ACCENT = '#0F766E';

export default function SitesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;

  const fetchSites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('egl_sites')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSites((data as Site[]) || []);
    } catch (err) {
      console.error('[sites] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSites();
  }, [fetchSites]);

  function renderSiteCard({ item }: { item: Site }) {
    const progress = item.total_lots && item.total_lots > 0
      ? Math.round(((item.completed_lots || 0) / item.total_lots) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={[styles.card, isTablet && styles.cardTablet]}
        onPress={() => router.push(`/(app)/site/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.siteName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.progressBadge, progress === 100 && styles.progressComplete]}>
            <Text style={[styles.progressText, progress === 100 && styles.progressTextComplete]}>
              {progress}%
            </Text>
          </View>
        </View>

        {item.address && (
          <Text style={styles.siteAddress} numberOfLines={1}>{item.address}</Text>
        )}

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.lotCount}>
            {item.completed_lots || 0} / {item.total_lots || 0} lots
          </Text>
          {item.city && (
            <Text style={styles.cityLabel}>{item.city}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sites</Text>
          <Text style={styles.headerSubtitle}>
            {user?.email || 'Inspector'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/(app)/settings')}
          >
            <Text style={styles.settingsBtnText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : sites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No sites yet</Text>
          <Text style={styles.emptySubtitle}>
            Sites will appear here when you are assigned to a project.
          </Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={sites}
          renderItem={renderSiteCard}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
        />
      )}

      {/* FAB — Create Site */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => router.push('/(app)/site-new')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#101828',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  settingsBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTablet: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  siteName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#101828',
    flex: 1,
    marginRight: 8,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  progressComplete: {
    backgroundColor: '#DCFCE7',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  progressTextComplete: {
    color: '#16A34A',
  },
  siteAddress: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667085',
  },
  cityLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: ACCENT,
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
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: -2,
  },
});
