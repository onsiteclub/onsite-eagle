/**
 * Site Detail — Main site view with 8 sub-views.
 *
 * Uses internal state for tab navigation (not Expo Router Tabs).
 * Equivalent to Monitor's `/site/[id]` page.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../src/lib/supabase';
import TabBar, { type ViewType } from '../../../src/components/TabBar';
import LotsView from '../../../src/components/LotsView';
import ScheduleView from '../../../src/components/ScheduleView';
import TimelineView from '../../../src/components/TimelineView';
import TeamView from '../../../src/components/TeamView';
import DocumentsView from '../../../src/components/DocumentsView';
import PaymentsView from '../../../src/components/PaymentsView';
import ReportsView from '../../../src/components/ReportsView';
import EmptyState from '../../../src/components/EmptyState';
import type { Site, House } from '@onsite/shared';

const ACCENT = '#0F766E';

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [site, setSite] = useState<Site | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('lots');

  const fetchSiteData = useCallback(async () => {
    if (!id) return;
    try {
      const [siteRes, housesRes] = await Promise.all([
        supabase.from('egl_sites').select('*').eq('id', id).single(),
        supabase
          .from('egl_houses')
          .select('*')
          .eq('site_id', id)
          .order('lot_number', { ascending: true }),
      ]);

      if (siteRes.error) throw siteRes.error;
      setSite(siteRes.data as Site);
      setHouses((housesRes.data as House[]) || []);
    } catch (err) {
      console.error('[site] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  function renderActiveView() {
    if (!id) return null;

    switch (activeView) {
      case 'lots':
        return (
          <LotsView
            siteId={id}
            houses={houses}
            onRefresh={fetchSiteData}
            onLotPress={(lotId) => router.push(`/(app)/lot/${lotId}`)}
          />
        );
      case 'schedule':
        return <ScheduleView siteId={id} houses={houses} />;
      case 'gantt':
        return <EmptyState title="Gantt View" subtitle="Gantt chart will show phase timelines across all lots." />;
      case 'chat':
        return <TimelineView siteId={id} />;
      case 'team':
        return <TeamView siteId={id} />;
      case 'documents':
        return <DocumentsView siteId={id} />;
      case 'payments':
        return <PaymentsView siteId={id} houses={houses} />;
      case 'reports':
        return <ReportsView siteId={id} />;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {site?.name || 'Site'}
          </Text>
          {site?.city && (
            <Text style={styles.headerSubtitle}>{site.city}</Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Bar */}
      <TabBar activeView={activeView} onChangeView={setActiveView} />

      {/* Active View */}
      <View style={styles.content}>
        {renderActiveView()}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#0F766E',
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 1,
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
  },
});
