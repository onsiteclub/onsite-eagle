import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../src/lib/supabase';
import type { Site } from '@onsite/shared';

type TabType = 'cards' | 'mapa' | 'settings';

export default function HomeScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('cards');

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    try {
      const { data } = await supabase
        .from('sites')
        .select('*')
        .order('name');

      if (data) {
        setSites(data);
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    } finally {
      setLoading(false);
    }
  }

  // Smart search: matches name, address, city, partial words
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites;

    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/);

    return sites.filter(site => {
      const searchText = `${site.name} ${site.address} ${site.city}`.toLowerCase();
      // Match if all query words are found (partial match)
      return queryWords.every(word => searchText.includes(word));
    });
  }, [sites, searchQuery]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Carregando jobsites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overview</Text>
        <Text style={styles.headerSubtitle}>{sites.length} obra{sites.length !== 1 ? 's' : ''} cadastrada{sites.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cards' && styles.tabActive]}
          onPress={() => setActiveTab('cards')}
        >
          <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive]}>
            Cards
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mapa' && styles.tabActive]}
          onPress={() => setActiveTab('mapa')}
        >
          <Text style={[styles.tabText, activeTab === 'mapa' && styles.tabTextActive]}>
            Mapa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'cards' && (
          <CardsTab
            sites={filteredSites}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
        {activeTab === 'mapa' && <MapaTab sites={sites} />}
        {activeTab === 'settings' && <SettingsTab />}
      </View>

      {/* FAB to add new jobsite */}
      {activeTab === 'cards' && (
        <Link href="/site/new" asChild>
          <TouchableOpacity style={styles.fab}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );
}

// Cards Tab Component
function CardsTab({
  sites,
  searchQuery,
  onSearchChange
}: {
  sites: Site[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar obra (nome, endereco, cidade...)"
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onSearchChange('')}
          >
            <Text style={styles.clearButtonText}>x</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {sites.length} obra{sites.length !== 1 ? 's' : ''}
          {searchQuery ? ` encontrada${sites.length !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      {/* Site Cards */}
      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Link href={`/site/${item.id}`} asChild>
            <TouchableOpacity style={styles.siteCard}>
              <View style={styles.siteHeader}>
                <Text style={styles.siteName}>{item.name}</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>
                    {item.completed_lots || 0}/{item.total_lots || 0}
                  </Text>
                </View>
              </View>

              <Text style={styles.siteAddress}>{item.address}</Text>
              <Text style={styles.siteCity}>{item.city}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${item.total_lots ? ((item.completed_lots || 0) / item.total_lots) * 100 : 0}%`
                    }
                  ]}
                />
              </View>

              <View style={styles.siteFooter}>
                <Text style={styles.siteDates}>
                  {item.start_date
                    ? `Inicio: ${new Date(item.start_date).toLocaleDateString('pt-BR')}`
                    : 'Sem data de inicio'
                  }
                </Text>
                {item.expected_end_date && (
                  <Text style={styles.siteDates}>
                    Previsao: {new Date(item.expected_end_date).toLocaleDateString('pt-BR')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nenhuma obra encontrada' : 'Nenhuma obra cadastrada'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Tente buscar com outros termos'
                : 'Adicione uma nova obra para comecar'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// Mapa Tab Component - Overview map of all sites
function MapaTab({ sites }: { sites: Site[] }) {
  return (
    <ScrollView style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>Mapa Geral</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          {sites.length} obra{sites.length !== 1 ? 's' : ''} no mapa
        </Text>
      </View>

      {/* Sites list as map legend */}
      <View style={styles.mapLegend}>
        <Text style={styles.legendTitle}>Obras</Text>
        {sites.map((site) => (
          <Link key={site.id} href={`/site/${site.id}`} asChild>
            <TouchableOpacity style={styles.legendSiteItem}>
              <View style={styles.legendSiteInfo}>
                <Text style={styles.legendSiteName}>{site.name}</Text>
                <Text style={styles.legendSiteAddress}>{site.city}</Text>
              </View>
              <View style={styles.legendSiteProgress}>
                <Text style={styles.legendProgressText}>
                  {site.completed_lots || 0}/{site.total_lots || 0}
                </Text>
              </View>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

// Settings Tab Component - General app settings
function SettingsTab() {
  return (
    <ScrollView style={styles.settingsContainer}>
      {/* User Profile */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Perfil</Text>
        <TouchableOpacity style={styles.settingsCard}>
          <Text style={styles.settingsCardText}>Gerenciar conta</Text>
          <Text style={styles.settingsCardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Notificacoes</Text>
        <TouchableOpacity style={styles.settingsCard}>
          <Text style={styles.settingsCardText}>Configurar alertas e lembretes</Text>
          <Text style={styles.settingsCardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Data Sync */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Sincronizacao</Text>
        <TouchableOpacity style={styles.settingsCard}>
          <Text style={styles.settingsCardText}>Gerenciar dados offline</Text>
          <Text style={styles.settingsCardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsCardText}>OnSite Dashboard</Text>
          <Text style={styles.settingsVersion}>v1.0.0</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
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
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  // Header styles
  header: {
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Tab bar styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#10B981',
  },
  tabContent: {
    flex: 1,
  },
  // Search styles
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  clearButton: {
    position: 'absolute',
    right: 28,
    padding: 8,
  },
  clearButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    color: '#6B7280',
    fontSize: 13,
  },
  // List styles
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  siteCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  progressBadge: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  siteAddress: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 2,
  },
  siteCity: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  siteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  siteDates: {
    fontSize: 12,
    color: '#6B7280',
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
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  // Map tab styles
  mapContainer: {
    flex: 1,
    padding: 16,
  },
  mapPlaceholder: {
    aspectRatio: 1.5,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  mapPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
  },
  mapLegend: {
    marginTop: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  legendSiteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  legendSiteInfo: {
    flex: 1,
  },
  legendSiteName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  legendSiteAddress: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  legendSiteProgress: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legendProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Settings tab styles
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsCardText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  settingsCardArrow: {
    fontSize: 18,
    color: '#6B7280',
  },
  settingsVersion: {
    fontSize: 14,
    color: '#6B7280',
  },
  // FAB styles
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
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
