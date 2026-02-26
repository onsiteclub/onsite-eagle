/**
 * Team view — list members assigned to a site.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';

const ACCENT = '#0F766E';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role?: string;
  trade?: string;
}

interface TeamViewProps {
  siteId: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: '#FEF3C7', text: '#92400E' },
  admin: { bg: '#DBEAFE', text: '#1E40AF' },
  supervisor: { bg: '#E0E7FF', text: '#3730A3' },
  inspector: { bg: '#F3E8FF', text: '#6B21A8' },
  worker: { bg: '#F3F4F6', text: '#374151' },
};

export default function TeamView({ siteId }: TeamViewProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchTeam() {
    try {
      // Get organization memberships through the site
      const { data: site } = await supabase
        .from('egl_sites')
        .select('organization_id')
        .eq('id', siteId)
        .single();

      if (!site?.organization_id) {
        setMembers([]);
        return;
      }

      const { data, error } = await supabase
        .from('core_org_memberships')
        .select('role, user_id, core_profiles(id, full_name, email)')
        .eq('organization_id', site.organization_id);

      if (error) throw error;

      const team: TeamMember[] = (data || []).map((m: any) => ({
        id: m.user_id,
        full_name: m.core_profiles?.full_name || null,
        email: m.core_profiles?.email || '',
        role: m.role,
      }));

      setMembers(team);
    } catch (err) {
      console.error('[team] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchTeam();
  }, [siteId]);

  function renderMember({ item }: { item: TeamMember }) {
    const roleColor = ROLE_COLORS[item.role || 'worker'] || ROLE_COLORS.worker;
    const initial = (item.full_name || item.email || '?')[0].toUpperCase();

    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.full_name || item.email}</Text>
          {item.full_name && <Text style={styles.email}>{item.email}</Text>}
        </View>
        {item.role && (
          <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
            <Text style={[styles.roleText, { color: roleColor.text }]}>{item.role}</Text>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No team members</Text>
        <Text style={styles.emptySubtitle}>
          Team members are assigned via organization memberships.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={members}
      renderItem={renderMember}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchTeam();
          }}
          tintColor={ACCENT}
          colors={[ACCENT]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
  },
  email: {
    fontSize: 13,
    color: '#667085',
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
