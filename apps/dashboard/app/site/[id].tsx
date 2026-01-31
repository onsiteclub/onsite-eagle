import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import type { Site, House, HouseStatus } from '@onsite/shared';

type TabType = 'lotes' | 'mapa' | 'settings';

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('lotes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSiteData();
    }
  }, [id]);

  async function loadSiteData() {
    try {
      // Load site details
      const { data: siteData } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single();

      if (siteData) {
        setSite(siteData);
      }

      // Load houses/lots for this site
      const { data: housesData } = await supabase
        .from('houses')
        .select('*')
        .eq('site_id', id)
        .order('lot_number');

      if (housesData) {
        setHouses(housesData);
      }
    } catch (error) {
      console.error('Error loading site data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Carregando jobsite...</Text>
      </View>
    );
  }

  if (!site) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Jobsite nao encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Site Header */}
      <View style={styles.header}>
        <Text style={styles.siteName}>{site.name}</Text>
        <Text style={styles.siteAddress}>{site.address}, {site.city}</Text>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {site.completed_lots || 0} de {site.total_lots || 0} lotes completos
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${site.total_lots ? (site.completed_lots / site.total_lots) * 100 : 0}%`
                }
              ]}
            />
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lotes' && styles.tabActive]}
          onPress={() => setActiveTab('lotes')}
        >
          <Text style={[styles.tabText, activeTab === 'lotes' && styles.tabTextActive]}>
            Lotes
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
        {activeTab === 'lotes' && <LotesTab houses={houses} siteId={id!} />}
        {activeTab === 'mapa' && <MapaTab site={site} houses={houses} />}
        {activeTab === 'settings' && <SettingsTab site={site} onUpdate={loadSiteData} />}
      </View>
    </View>
  );
}

// Lotes Tab Component
function LotesTab({ houses, siteId }: { houses: House[]; siteId: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'delayed': return '#EF4444';
      case 'on_hold': return '#8B5CF6';
      case 'not_started': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completo';
      case 'in_progress': return 'Em Progresso';
      case 'delayed': return 'Atrasado';
      case 'on_hold': return 'Pausado';
      case 'not_started': return 'Nao Iniciado';
      default: return status;
    }
  };

  const TOTAL_PHASES = 7; // Total phases in the system

  return (
    <FlatList
      data={houses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.lotesList}
      numColumns={2}
      renderItem={({ item }) => {
        return (
          <Link href={`/house/${item.id}`} asChild>
            <TouchableOpacity style={styles.loteCard}>
              <View style={styles.loteHeader}>
                <Text style={styles.loteLot}>Lote {item.lot_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>

              {item.address && (
                <Text style={styles.loteModel}>{item.address}</Text>
              )}

              <View style={styles.loteProgress}>
                <Text style={styles.loteProgressText}>
                  {Math.round(item.progress_percentage)}% completo
                </Text>
                <View style={styles.loteProgressBar}>
                  <View
                    style={[
                      styles.loteProgressFill,
                      { width: `${item.progress_percentage}%` }
                    ]}
                  />
                </View>
              </View>

              {item.current_phase > 0 && (
                <Text style={styles.loteCurrentPhase}>
                  Fase {item.current_phase} de {TOTAL_PHASES}
                </Text>
              )}
            </TouchableOpacity>
          </Link>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyLotes}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyText}>Nenhum lote cadastrado</Text>
          <Text style={styles.emptySubtext}>Adicione lotes no mapa ou nas configuracoes</Text>
        </View>
      }
    />
  );
}

// Mapa Tab Component
function MapaTab({ site, houses }: { site: Site; houses: House[] }) {
  if (!site.svg_data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>Nenhum mapa configurado</Text>
        <Text style={styles.emptySubtext}>Configure o mapa SVG nas configuracoes</Text>
      </View>
    );
  }

  // TODO: Implement SVG rendering with react-native-svg
  // For now, show placeholder
  return (
    <ScrollView style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>Mapa SVG</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          {houses.length} lotes no mapa
        </Text>
        {/*
          TODO: Render SVG with clickable lots
          Each lot should be colored based on status:
          - Green: completed
          - Yellow: in_progress
          - Gray: pending
          Clicking a lot should navigate to /house/[id]
        */}
      </View>

      {/* Legend */}
      <View style={styles.mapLegend}>
        <Text style={styles.legendTitle}>Legenda</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Completo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Em Progresso</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#6B7280' }]} />
          <Text style={styles.legendText}>Pendente</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Settings Tab Component
function SettingsTab({ site, onUpdate }: { site: Site; onUpdate: () => void }) {
  return (
    <ScrollView style={styles.settingsContainer}>
      {/* Site Info Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Informacoes do Projeto</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Nome</Text>
            <Text style={styles.settingsValue}>{site.name}</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Endereco</Text>
            <Text style={styles.settingsValue}>{site.address}</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Cidade</Text>
            <Text style={styles.settingsValue}>{site.city}</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Total de Lotes</Text>
            <Text style={styles.settingsValue}>{site.total_lots || 0}</Text>
          </View>
        </View>
      </View>

      {/* Dates Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Datas</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Inicio</Text>
            <Text style={styles.settingsValue}>
              {site.start_date
                ? new Date(site.start_date).toLocaleDateString('pt-BR')
                : 'Nao definida'}
            </Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Previsao de Termino</Text>
            <Text style={styles.settingsValue}>
              {site.expected_end_date
                ? new Date(site.expected_end_date).toLocaleDateString('pt-BR')
                : 'Nao definida'}
            </Text>
          </View>
        </View>
      </View>

      {/* Contacts Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Pessoas</Text>
        <TouchableOpacity style={styles.settingsCard}>
          <Text style={styles.settingsCardText}>Gerenciar contatos do projeto</Text>
          <Text style={styles.settingsCardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Documents Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Documentos</Text>
        <TouchableOpacity style={styles.settingsCard}>
          <Text style={styles.settingsCardText}>Ver contratos, plantas e permissoes</Text>
          <Text style={styles.settingsCardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Rules Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Regras do Projeto</Text>
        <TouchableOpacity style={styles.settingsCard}>
          <Text style={styles.settingsCardText}>Configurar regras de seguranca e qualidade</Text>
          <Text style={styles.settingsCardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Zona de Perigo</Text>
        <TouchableOpacity style={[styles.settingsCard, styles.dangerCard]}>
          <Text style={styles.dangerText}>Excluir Jobsite</Text>
        </TouchableOpacity>
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
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  siteName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  siteAddress: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  progressInfo: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 13,
    color: '#D1D5DB',
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
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
  // Lotes Tab Styles
  lotesList: {
    padding: 12,
  },
  loteCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    margin: 4,
    borderWidth: 1,
    borderColor: '#374151',
    maxWidth: '48%',
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loteLot: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  loteModel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  loteProgress: {
    marginBottom: 8,
  },
  loteProgressText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  loteProgressBar: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loteProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  loteCurrentPhase: {
    fontSize: 11,
    color: '#F59E0B',
  },
  emptyLotes: {
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
  // Map Tab Styles
  mapContainer: {
    flex: 1,
    padding: 16,
  },
  mapPlaceholder: {
    aspectRatio: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
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
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 10,
  },
  legendText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  // Settings Tab Styles
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
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  settingsLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  settingsValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  settingsCardText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  settingsCardArrow: {
    fontSize: 18,
    color: '#6B7280',
  },
  dangerCard: {
    borderColor: '#7F1D1D',
    backgroundColor: '#1F1717',
  },
  dangerText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
});
