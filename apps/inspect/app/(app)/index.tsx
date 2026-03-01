/**
 * Home — Main screen of the Inspect app.
 *
 * Auto-loads the user's first site. If multiple sites, shows a dropdown
 * to switch. Top half: feature cards (Agenda, Team, Timeline, Documents).
 * Bottom half: lots grid (tap → Lot Detail timeline).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import StatusBadge from '../../src/components/StatusBadge';
import type { Site, House, HouseStatus } from '@onsite/shared';

const ACCENT = '#0F766E';

const FEATURES = [
  { key: 'agenda', label: 'Agenda', emoji: '📅', route: '/(app)/agenda' },
  { key: 'team', label: 'Team', emoji: '👥', route: '/(app)/team' },
  { key: 'timeline', label: 'Timeline', emoji: '💬', route: '/(app)/site-timeline' },
  { key: 'documents', label: 'Documents', emoji: '📄', route: '/(app)/documents' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sitePickerVisible, setSitePickerVisible] = useState(false);

  const activeSite = useMemo(
    () => sites.find((s) => s.id === activeSiteId) || null,
    [sites, activeSiteId],
  );

  const filteredHouses = useMemo(() => {
    if (!searchQuery.trim()) return houses;
    const q = searchQuery.toLowerCase();
    return houses.filter(
      (h) =>
        h.lot_number?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q),
    );
  }, [houses, searchQuery]);

  // Fetch all sites + houses for active site
  const fetchData = useCallback(async (siteId?: string | null) => {
    try {
      const { data: sitesData, error: sitesErr } = await supabase
        .from('frm_jobsites')
        .select('*')
        .order('updated_at', { ascending: false });

      if (sitesErr) throw sitesErr;
      const allSites = (sitesData as Site[]) || [];
      setSites(allSites);

      // Pick active site
      const targetId = siteId || allSites[0]?.id || null;
      setActiveSiteId(targetId);

      // Fetch houses for active site
      if (targetId) {
        const { data: housesData, error: housesErr } = await supabase
          .from('frm_lots')
          .select('*')
          .eq('jobsite_id', targetId)
          .order('lot_number', { ascending: true });

        if (housesErr) throw housesErr;
        setHouses((housesData as House[]) || []);
      } else {
        setHouses([]);
      }
    } catch (err) {
      console.error('[home] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(activeSiteId);
  }, [fetchData, activeSiteId]);

  // Switch site
  function handleSiteSwitch(siteId: string) {
    setSitePickerVisible(false);
    setActiveSiteId(siteId);
    setHouses([]);
    setSearchQuery('');
    setLoading(true);
    fetchData(siteId);
  }

  // Navigate to feature screen
  function handleFeaturePress(route: string) {
    if (!activeSiteId) return;
    router.push({ pathname: route as never, params: { siteId: activeSiteId } });
  }

  // Render lot card
  function renderLotCard({ item }: { item: House }) {
    const progress = item.progress_percentage || 0;
    return (
      <TouchableOpacity
        style={styles.lotCard}
        onPress={() => router.push(`/(app)/lot/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.lotTop}>
          <Text style={styles.lotNumber}>Lot {item.lot_number}</Text>
          <StatusBadge status={(item.status as HouseStatus) || 'not_started'} />
        </View>
        <View style={styles.lotProgressBar}>
          <View style={[styles.lotProgressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.lotBottom}>
          <Text style={styles.lotProgressLabel}>{Math.round(progress)}%</Text>
          {item.current_phase != null && (
            <Text style={styles.lotPhaseLabel}>Phase {item.current_phase}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Header component for FlatList (site info + feature cards + search)
  function ListHeader() {
    const progress =
      activeSite && activeSite.total_lots && activeSite.total_lots > 0
        ? Math.round(((activeSite.completed_lots || 0) / activeSite.total_lots) * 100)
        : 0;

    return (
      <View>
        {/* Site Progress Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {activeSite?.completed_lots || 0} / {activeSite?.total_lots || 0} lots completed
            </Text>
            <Text style={styles.summaryPercent}>{progress}%</Text>
          </View>
          <View style={styles.summaryProgressBar}>
            <View style={[styles.summaryProgressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={styles.featureCard}
              onPress={() => handleFeaturePress(f.route)}
              activeOpacity={0.7}
            >
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lots Section Header + Search */}
        <View style={styles.lotsHeader}>
          <Text style={styles.lotsSectionTitle}>Lots</Text>
          <Text style={styles.lotsCount}>{filteredHouses.length}</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search lots..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (sites.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>No sites yet</Text>
        <Text style={styles.emptySubtitle}>
          Sites will appear here when you are assigned to a project.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with site name + dropdown */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.siteSwitcher}
          onPress={() => sites.length > 1 && setSitePickerVisible(true)}
          activeOpacity={sites.length > 1 ? 0.7 : 1}
        >
          <Text style={styles.siteName} numberOfLines={1}>
            {activeSite?.name || 'Site'}
          </Text>
          {sites.length > 1 && <Text style={styles.dropdownArrow}>▾</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/(app)/settings')}
        >
          <Text style={styles.settingsBtnText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Subtitle: city + user */}
      <View style={styles.subheader}>
        {activeSite?.city && (
          <Text style={styles.subheaderText}>{activeSite.city}</Text>
        )}
        <Text style={styles.subheaderUser}>{user?.email || 'Inspector'}</Text>
      </View>

      {/* Main content */}
      <FlatList
        data={filteredHouses}
        renderItem={renderLotCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyLots}>
            <Text style={styles.emptyLotsText}>No lots found</Text>
          </View>
        }
      />

      {/* Site Picker Modal */}
      <Modal
        visible={sitePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSitePickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSitePickerVisible(false)}>
          <View style={[styles.modalSheet, { marginTop: insets.top + 60 }]}>
            <Text style={styles.modalTitle}>Switch Site</Text>
            {sites.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.modalItem,
                  s.id === activeSiteId && styles.modalItemActive,
                ]}
                onPress={() => handleSiteSwitch(s.id)}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    s.id === activeSiteId && styles.modalItemTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {s.name}
                </Text>
                {s.city && <Text style={styles.modalItemCity}>{s.city}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  siteSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  siteName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#101828',
    flexShrink: 1,
  },
  dropdownArrow: {
    fontSize: 20,
    color: '#667085',
    marginLeft: 6,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsBtnText: {
    fontSize: 18,
  },

  // Subheader
  subheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subheaderText: {
    fontSize: 14,
    color: '#667085',
  },
  subheaderUser: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Summary
  summarySection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#667085',
  },
  summaryPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  summaryProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },

  // Features
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  featureCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 6,
  },
  featureEmoji: {
    fontSize: 28,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  // Lots header
  lotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  lotsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  lotsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667085',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#101828',
  },

  // Lot cards
  listContent: {
    paddingBottom: 32,
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lotNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
  },
  lotProgressBar: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  lotProgressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
  lotBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotProgressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  lotPhaseLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Empty states
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
  emptyLots: {
    padding: 40,
    alignItems: 'center',
  },
  emptyLotsText: {
    fontSize: 15,
    color: '#667085',
  },

  // Site Picker Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemActive: {
    backgroundColor: '#F0FDFA',
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  modalItemTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  modalItemCity: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
