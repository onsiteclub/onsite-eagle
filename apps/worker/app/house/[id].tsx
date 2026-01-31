import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../src/lib/supabase';
import type { House, TimelineEvent, PhasePhoto } from '@onsite/shared';
import { getStatusColor, getStatusLabel, CONSTRUCTION_PHASES, PHASE_ITEMS } from '@onsite/shared';

type TabType = 'timeline' | 'files' | 'phases';

export default function HouseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [photos, setPhotos] = useState<PhasePhoto[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadHouseData();
    }
  }, [id]);

  async function loadHouseData() {
    try {
      const [houseRes, timelineRes, photosRes] = await Promise.all([
        supabase.from('houses').select('*').eq('id', id).single(),
        supabase
          .from('timeline_events')
          .select('*')
          .eq('house_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('phase_photos')
          .select('*')
          .eq('house_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (houseRes.data) setHouse(houseRes.data);
      if (timelineRes.data) setTimeline(timelineRes.data);
      if (photosRes.data) setPhotos(photosRes.data);
    } catch (error) {
      console.error('Error loading house:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Casa não encontrada</Text>
      </View>
    );
  }

  const currentPhase = CONSTRUCTION_PHASES[house.current_phase] || CONSTRUCTION_PHASES[0];

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.lotNumber}>Lote {house.lot_number}</Text>
            {house.address && <Text style={styles.address}>{house.address}</Text>}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(house.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(house.status)}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.phaseName}>{currentPhase.name}</Text>
            <Text style={styles.progressPercent}>{house.progress_percentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${house.progress_percentage}%` }]} />
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && styles.tabActive]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
            📅 Timeline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'files' && styles.tabActive]}
          onPress={() => setActiveTab('files')}
        >
          <Text style={[styles.tabText, activeTab === 'files' && styles.tabTextActive]}>
            📁 Arquivos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'phases' && styles.tabActive]}
          onPress={() => setActiveTab('phases')}
        >
          <Text style={[styles.tabText, activeTab === 'phases' && styles.tabTextActive]}>
            🏗️ Fases
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'timeline' && <TimelineTab timeline={timeline} />}
        {activeTab === 'files' && <FilesTab photos={photos} />}
        {activeTab === 'phases' && <PhasesTab house={house} />}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/camera')}
      >
        <Text style={styles.fabText}>📷</Text>
      </TouchableOpacity>
    </View>
  );
}

function TimelineTab({ timeline }: { timeline: TimelineEvent[] }) {
  const getEventIcon = (type: string) => {
    const icons: Record<string, string> = {
      photo: '📷',
      email: '📧',
      calendar: '📅',
      note: '📝',
      alert: '⚠️',
      ai_validation: '🤖',
      status_change: '🔄',
      issue: '🚨',
      inspection: '✅',
    };
    return icons[type] || '📋';
  };

  if (timeline.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>Nenhum evento registrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineContainer}>
      {timeline.map((event, index) => (
        <View key={event.id} style={styles.timelineItem}>
          <View style={styles.timelineLine}>
            <View style={styles.timelineDot}>
              <Text style={styles.timelineDotIcon}>{getEventIcon(event.event_type)}</Text>
            </View>
            {index < timeline.length - 1 && <View style={styles.timelineConnector} />}
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>{event.title}</Text>
            {event.description && (
              <Text style={styles.timelineDescription}>{event.description}</Text>
            )}
            <Text style={styles.timelineDate}>
              {format(new Date(event.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
            </Text>
            {event.source_link && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => Linking.openURL(event.source_link!)}
              >
                <Text style={styles.linkText}>Abrir link →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function FilesTab({ photos }: { photos: PhasePhoto[] }) {
  if (photos.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📁</Text>
        <Text style={styles.emptyText}>Nenhum arquivo ainda</Text>
        <Text style={styles.emptySubtext}>Fotos enviadas aparecerão aqui</Text>
      </View>
    );
  }

  return (
    <View style={styles.filesGrid}>
      {photos.map((photo) => (
        <TouchableOpacity key={photo.id} style={styles.fileCard}>
          <View style={styles.fileThumbnail}>
            <Text style={styles.fileIcon}>🖼️</Text>
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>
              {CONSTRUCTION_PHASES.find((p) => p.id.toString() === photo.phase_id)?.name || 'Foto'}
            </Text>
            <Text style={styles.fileDate}>
              {format(new Date(photo.created_at), 'dd/MM/yyyy')}
            </Text>
            <View style={[
              styles.validationBadge,
              { backgroundColor: photo.ai_validation_status === 'approved' ? '#10B981' : '#F59E0B' }
            ]}>
              <Text style={styles.validationText}>
                {photo.ai_validation_status === 'approved' ? '✓ Aprovado' : '⏳ Pendente'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PhasesTab({ house }: { house: House }) {
  return (
    <View style={styles.phasesContainer}>
      {CONSTRUCTION_PHASES.map((phase, index) => {
        const isCurrentPhase = index === house.current_phase;
        const isCompleted = index < house.current_phase;
        const items = PHASE_ITEMS[index] || [];

        return (
          <View
            key={phase.id}
            style={[
              styles.phaseCard,
              isCurrentPhase && styles.phaseCardCurrent,
              isCompleted && styles.phaseCardCompleted,
            ]}
          >
            <View style={styles.phaseHeader}>
              <View style={styles.phaseNumberBadge}>
                <Text style={styles.phaseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.phaseHeaderInfo}>
                <Text style={styles.phaseTitle}>{phase.name}</Text>
                <Text style={styles.phaseItemCount}>
                  {items.length} itens • {isCompleted ? '✅ Concluída' : isCurrentPhase ? '🔄 Em andamento' : '⏳ Pendente'}
                </Text>
              </View>
            </View>

            {isCurrentPhase && (
              <View style={styles.phaseItems}>
                {items.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.phaseItem}>
                    <Text style={styles.phaseItemDot}>•</Text>
                    <Text style={styles.phaseItemText}>{item.name}</Text>
                  </View>
                ))}
                {items.length > 5 && (
                  <Text style={styles.moreItems}>+{items.length - 5} mais itens</Text>
                )}
              </View>
            )}
          </View>
        );
      })}
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
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  headerCard: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  lotNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  address: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
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
  progressSection: {},
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseName: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
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
    borderBottomColor: '#10B981',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#10B981',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Timeline styles
  timelineContainer: {},
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLine: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotIcon: {
    fontSize: 14,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#374151',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
    marginBottom: 12,
  },
  timelineTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  linkButton: {
    marginTop: 8,
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 13,
  },
  // Files styles
  filesGrid: {
    gap: 12,
  },
  fileCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  fileThumbnail: {
    width: 60,
    height: 60,
    backgroundColor: '#374151',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileDate: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  validationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  validationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  // Phases styles
  phasesContainer: {
    gap: 12,
  },
  phaseCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#374151',
  },
  phaseCardCurrent: {
    borderLeftColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  phaseCardCompleted: {
    borderLeftColor: '#10B981',
    opacity: 0.7,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phaseNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  phaseHeaderInfo: {
    flex: 1,
  },
  phaseTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  phaseItemCount: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  phaseItems: {
    marginTop: 12,
    marginLeft: 40,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  phaseItemDot: {
    color: '#10B981',
    marginRight: 8,
    fontSize: 16,
  },
  phaseItemText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  moreItems: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
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
  },
});
