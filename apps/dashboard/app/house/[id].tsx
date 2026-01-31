import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import type { House, TimelineEvent } from '@onsite/shared';
import { getStatusColor, getStatusLabel, CONSTRUCTION_PHASES } from '@onsite/shared';

type TabType = 'info' | 'mapa' | 'docs';

export default function HouseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  useEffect(() => {
    if (id) {
      loadHouseData();
    }
  }, [id]);

  async function loadHouseData() {
    try {
      // Load house
      const { data: houseData } = await supabase
        .from('houses')
        .select('*')
        .eq('id', id)
        .single();

      if (houseData) {
        setHouse(houseData);
      }

      // Load timeline
      const { data: timelineData } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('house_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (timelineData) {
        setTimeline(timelineData);
      }
    } catch (error) {
      console.error('Error loading house:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Casa nao encontrada</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.lotNumber}>Lote {house.lot_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(house.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(house.status)}</Text>
          </View>
        </View>
        {house.address && <Text style={styles.address}>{house.address}</Text>}
        {/* Progress summary in header */}
        <View style={styles.headerProgress}>
          <Text style={styles.headerProgressText}>{house.progress_percentage}% completo</Text>
          <View style={styles.headerProgressBar}>
            <View style={[styles.headerProgressFill, { width: `${house.progress_percentage}%` }]} />
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
            Progresso
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
          style={[styles.tab, activeTab === 'docs' && styles.tabActive]}
          onPress={() => setActiveTab('docs')}
        >
          <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>
            Docs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'info' && <InfoTab house={house} timeline={timeline} />}
        {activeTab === 'mapa' && <MapaTab house={house} />}
        {activeTab === 'docs' && <DocsTab house={house} />}
      </View>
    </View>
  );
}

// Info/Progress Tab Component
function InfoTab({ house, timeline }: { house: House; timeline: TimelineEvent[] }) {
  const currentPhase = CONSTRUCTION_PHASES[house.current_phase] || CONSTRUCTION_PHASES[0];

  return (
    <ScrollView style={styles.scrollContainer}>
      {/* Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fase Atual</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressPhase}>{currentPhase.name}</Text>
            <Text style={styles.progressPercent}>{house.progress_percentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${house.progress_percentage}%` }]}
            />
          </View>
          <Text style={styles.progressDescription}>{currentPhase.description}</Text>
        </View>
      </View>

      {/* All Phases */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Todas as Fases</Text>
        {CONSTRUCTION_PHASES.map((phase, index) => (
          <View key={index} style={styles.phaseItem}>
            <View style={[
              styles.phaseIndicator,
              { backgroundColor: index < house.current_phase ? '#10B981' : index === house.current_phase ? '#3B82F6' : '#374151' }
            ]} />
            <View style={styles.phaseInfo}>
              <Text style={[
                styles.phaseName,
                { color: index <= house.current_phase ? '#fff' : '#6B7280' }
              ]}>{phase.name}</Text>
              <Text style={styles.phaseDescription}>{phase.description}</Text>
            </View>
            {index < house.current_phase && (
              <Text style={styles.phaseComplete}>OK</Text>
            )}
            {index === house.current_phase && (
              <Text style={styles.phaseCurrent}>Em andamento</Text>
            )}
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acoes Rapidas</Text>
        <View style={styles.actions}>
          <Link href="/camera" asChild>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={styles.actionText}>Tirar Foto</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={styles.actionText}>Reportar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Nota</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atividade Recente</Text>
        {timeline.length === 0 ? (
          <Text style={styles.emptyTimeline}>Nenhuma atividade ainda</Text>
        ) : (
          timeline.map((event) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                {event.description && (
                  <Text style={styles.timelineDescription}>{event.description}</Text>
                )}
                <Text style={styles.timelineDate}>
                  {new Date(event.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Mapa Tab Component - Shows house/lot map with progress stages
function MapaTab({ house }: { house: House }) {
  const currentPhase = CONSTRUCTION_PHASES[house.current_phase] || CONSTRUCTION_PHASES[0];

  return (
    <ScrollView style={styles.scrollContainer}>
      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderIcon}>🏠</Text>
        <Text style={styles.mapPlaceholderText}>Planta do Lote {house.lot_number}</Text>
        <Text style={styles.mapPlaceholderSubtext}>Fase: {currentPhase.name}</Text>
      </View>

      {/* Stage Legend */}
      <View style={styles.stageLegend}>
        <Text style={styles.legendTitle}>Legenda de Estagios</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Concluido</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Em Progresso</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Pendente</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Problema</Text>
        </View>
      </View>

      {/* Current stage info */}
      <View style={styles.stageInfoCard}>
        <Text style={styles.stageInfoTitle}>Estagio Atual</Text>
        <Text style={styles.stageInfoPhase}>{currentPhase.name}</Text>
        <Text style={styles.stageInfoDescription}>{currentPhase.description}</Text>
        <View style={styles.stageProgressRow}>
          <Text style={styles.stageProgressLabel}>Progresso da fase:</Text>
          <Text style={styles.stageProgressValue}>{house.progress_percentage}%</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Docs Tab Component - Documentation, plants, inspections, people
function DocsTab({ house }: { house: House }) {
  return (
    <ScrollView style={styles.scrollContainer}>
      {/* Plants Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plantas</Text>
        <TouchableOpacity style={styles.docCard}>
          <Text style={styles.docIcon}>📐</Text>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>Planta Baixa</Text>
            <Text style={styles.docSubtitle}>PDF - Arquitetura</Text>
          </View>
          <Text style={styles.docArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.docCard}>
          <Text style={styles.docIcon}>🔌</Text>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>Projeto Eletrico</Text>
            <Text style={styles.docSubtitle}>PDF - Instalacoes</Text>
          </View>
          <Text style={styles.docArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.docCard}>
          <Text style={styles.docIcon}>🚰</Text>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>Projeto Hidraulico</Text>
            <Text style={styles.docSubtitle}>PDF - Instalacoes</Text>
          </View>
          <Text style={styles.docArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Inspections Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inspecoes</Text>
        <TouchableOpacity style={styles.docCard}>
          <Text style={styles.docIcon}>✅</Text>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>Inspecao de Fundacao</Text>
            <Text style={styles.docSubtitle}>Aprovado - 15/01/2024</Text>
          </View>
          <Text style={styles.docArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.docCard}>
          <Text style={styles.docIcon}>🔍</Text>
          <View style={styles.docInfo}>
            <Text style={styles.docTitle}>Inspecao Eletrica</Text>
            <Text style={styles.docSubtitle}>Pendente</Text>
          </View>
          <Text style={styles.docArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* People Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pessoas Envolvidas</Text>
        <TouchableOpacity style={styles.personCard}>
          <View style={styles.personAvatar}>
            <Text style={styles.personAvatarText}>JC</Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>Joao Carlos</Text>
            <Text style={styles.personRole}>Mestre de Obras</Text>
          </View>
          <Text style={styles.docArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.personCard}>
          <View style={styles.personAvatar}>
            <Text style={styles.personAvatarText}>MS</Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>Maria Silva</Text>
            <Text style={styles.personRole}>Engenheira</Text>
          </View>
          <Text style={styles.docArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addPersonButton}>
          <Text style={styles.addPersonText}>+ Adicionar Pessoa</Text>
        </TouchableOpacity>
      </View>

      {/* Upload Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload de Documentos</Text>
        <TouchableOpacity style={styles.uploadButton}>
          <Text style={styles.uploadIcon}>📤</Text>
          <Text style={styles.uploadText}>Enviar novo documento</Text>
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
  scrollContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  // Header styles
  header: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  headerProgress: {
    marginTop: 12,
  },
  headerProgressText: {
    color: '#D1D5DB',
    fontSize: 13,
    marginBottom: 6,
  },
  headerProgressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
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
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  tabContent: {
    flex: 1,
  },
  // Section styles
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Progress card styles
  progressCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressPhase: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 12,
  },
  // Phase list styles
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  phaseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: '500',
  },
  phaseDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  phaseComplete: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  phaseCurrent: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Action styles
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
  },
  // Timeline styles
  emptyTimeline: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  timelineTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  timelineDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  timelineDate: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 8,
  },
  // Map tab styles
  mapPlaceholder: {
    margin: 16,
    aspectRatio: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  stageLegend: {
    margin: 16,
    marginTop: 0,
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
  stageInfoCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  stageInfoTitle: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stageInfoPhase: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  stageInfoDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  stageProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  stageProgressLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  stageProgressValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Docs tab styles
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  docIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  docSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  docArrow: {
    fontSize: 18,
    color: '#6B7280',
  },
  // Person card styles
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  personRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addPersonButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  addPersonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  // Upload button styles
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  uploadText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
