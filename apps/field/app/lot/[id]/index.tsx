/**
 * Lot Detail — Tabbed view with Chat, Plans, Tasks, Timeline
 *
 * Internal tabs (not file-based routing). Header shows lot circle,
 * phase name, progress, and camera shortcut.
 *
 * Queries: frm_lots, frm_messages, frm_documents, frm_house_items,
 *          frm_phase_assignments, frm_jobsites.
 * Enterprise v3 light theme.
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '@onsite/auth';
import { FRAMING_PHASES } from '@onsite/framing';
import { supabase } from '../../../src/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface House {
  id: string;
  lot_number: string;
  address: string | null;
  status: string;
  current_phase: string | null;
  progress_percentage: number;
  jobsite_id: string;
  jobsite: { id: string; name: string } | null;
}

interface Message {
  id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string;
  content: string;
  phase_at_creation: number | null;
  created_at: string;
}

interface DocumentRow {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  description: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface PhaseAssignment {
  id: string;
  lot_id: string;
  phase_id: string;
  status: string; // assigned | started | completed
  started_at: string | null;
  completed_at: string | null;
}

interface ChecklistCompletion {
  id: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabId = 'chat' | 'plans' | 'tasks' | 'timeline';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'chat', label: 'Chat', icon: 'chatbubble-ellipses' },
  { id: 'plans', label: 'Plans', icon: 'document-text' },
  { id: 'tasks', label: 'Tasks', icon: 'checkbox' },
  { id: 'timeline', label: 'Timeline', icon: 'git-branch' },
];

const LOT_COLORS = ['#10B981', '#F97316', '#6366F1', '#3B82F6', '#8B5CF6', '#EC4899'];
const ACCENT = '#0F766E';

const PHASE_CHECKLISTS: Record<string, string[]> = {
  capping: [
    'Foundation walls waterproofed',
    'Sill plates bolted and sealed',
    'Anchor bolts properly spaced',
    'Sill gasket installed',
    'Grade beams level and clean',
    'Backfill area clear',
  ],
  floor_1: [
    'Joists installed at 16" O.C.',
    'Blocking between joists at bearing walls',
    'Subfloor glued and screwed (T&G)',
    'Bottom plates laid and nailed',
    'Studs at 16" O.C.',
    'Double top plates installed',
    'Headers over openings (correct size)',
    'Corner assemblies complete',
    'Partition intersections backed',
    'Walls plumb and braced',
  ],
  walls_1: [
    'Exterior sheathing installed',
    'Window and door openings framed',
    'Cripple studs and king studs in place',
    'Let-in bracing or shear panels',
    'Nailing pattern per plan',
    'Fire blocking installed',
    'Beam pockets framed correctly',
    'Hold-downs and straps installed',
    'Utility notches within limits',
    'Walls square and aligned',
  ],
  floor_2: [
    'Second floor joists installed at 16" O.C.',
    'Joist hangers properly nailed',
    'Blocking at bearing walls',
    'Subfloor glued and screwed (T&G)',
    'Cantilevers properly supported',
    'Rim board continuous and fastened',
    'Bottom plates laid and nailed',
    'Studs at 16" O.C.',
    'Double top plates installed',
    'Openings correctly framed',
  ],
  walls_2: [
    'Exterior sheathing complete',
    'All openings properly framed',
    'Shear panel nailing complete',
    'Hold-downs installed per plan',
    'Fire blocking at all levels',
    'Utility rough-in clearances checked',
    'Beam connections verified',
    'Nailing schedule met',
    'Walls plumb and braced',
    'Ready for roof framing',
  ],
  roof: [
    'Trusses set and braced',
    'Ridge beam level (if applicable)',
    'Fascia board installed',
    'Roof sheathing complete (H-clips)',
    'Drip edge installed',
    'Ice and water shield applied',
    'Felt paper/synthetic underlayment',
    'Shingles installed per spec',
  ],
  backframe_basement: [
    'Basement walls framed',
    'Insulation installed (R-value)',
    'Vapor barrier installed',
    'Electrical rough-in complete',
    'Plumbing rough-in complete',
    'HVAC rough-in complete',
    'Fire stopping complete',
  ],
  backframe_strapping: [
    'Strapping installed level',
    'Correct spacing maintained',
    'Secured to framing members',
    'No bowing or warping',
    'Utility clearances maintained',
    'Ready for drywall',
  ],
  backframe_backing: [
    'Backing for cabinets installed',
    'Backing for handrails installed',
    'Backing for grab bars installed',
    'Backing for TV mounts installed',
    'Backing for heavy fixtures installed',
    'Blocking for shower doors',
    'Medicine cabinet backing',
    'All backing per plan specs',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLotColor(lotNumber: string): string {
  const num = parseInt(lotNumber, 10) || 0;
  return LOT_COLORS[num % LOT_COLORS.length];
}

function getPhaseName(phaseId: string | null): string {
  if (!phaseId) return 'Not Started';
  const phase = FRAMING_PHASES.find((p) => p.id === phaseId);
  return phase?.name || phaseId;
}

function computeProgress(assignments: PhaseAssignment[]): number {
  if (assignments.length === 0) return 0;
  const completed = assignments.filter((a) => a.status === 'completed').length;
  return Math.round((completed / FRAMING_PHASES.length) * 100);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMessageTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'h:mm a');
  } catch {
    return '';
  }
}

function formatMessageDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Core state
  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Plans state
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);

  // Tasks state
  const [checklistCompletions, setChecklistCompletions] = useState<ChecklistCompletion[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Timeline state
  const [assignments, setAssignments] = useState<PhaseAssignment[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineLoaded, setTimelineLoaded] = useState(false);

  // -----------------------------------------------------------------------
  // Load lot on mount
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (id) loadLotData();
  }, [id]);

  async function loadLotData() {
    try {
      const { data: houseData } = await supabase
        .from('frm_lots')
        .select(`
          id, lot_number, address, status,
          current_phase, jobsite_id,
          jobsite:frm_jobsites ( id, name )
        `)
        .eq('id', id)
        .single();

      if (houseData) {
        const normalized = {
          ...houseData,
          jobsite: Array.isArray(houseData.jobsite) ? houseData.jobsite[0] : houseData.jobsite,
          progress_percentage: 0,
        } as House;
        setHouse(normalized);

        // Load phase assignments to compute progress
        const { data: assignData } = await supabase
          .from('frm_phase_assignments')
          .select('id, lot_id, phase_id, status, started_at, completed_at')
          .eq('lot_id', id);

        if (assignData) {
          setAssignments(assignData);
          const pct = computeProgress(assignData);
          setHouse((prev) => (prev ? { ...prev, progress_percentage: pct } : prev));
          setTimelineLoaded(true);
        }
      }
    } catch (error) {
      console.error('Error loading lot:', error);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Lazy-load tab data
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!id || !house) return;

    if (activeTab === 'chat' && !messagesLoaded) {
      loadMessages();
    } else if (activeTab === 'plans' && !docsLoaded) {
      loadDocuments();
    } else if (activeTab === 'tasks' && !tasksLoaded) {
      loadChecklist();
    } else if (activeTab === 'timeline' && !timelineLoaded) {
      loadTimeline();
    }
  }, [activeTab, id, house]);

  // -----------------------------------------------------------------------
  // Chat
  // -----------------------------------------------------------------------

  async function loadMessages() {
    setMessagesLoading(true);
    try {
      const { data } = await supabase
        .from('frm_messages')
        .select('*')
        .eq('lot_id', id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data);
      setMessagesLoaded(true);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }

  // Realtime subscription for chat
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`messages-lot-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'frm_messages',
          filter: `lot_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending || !house) return;

    setSending(true);
    setInputText('');

    try {
      await supabase.from('frm_messages').insert({
        lot_id: id,
        jobsite_id: house.jobsite_id,
        sender_type: 'worker',
        sender_id: user?.id,
        sender_name: user?.email?.split('@')[0] || 'Worker',
        content: text,
        phase_at_creation: house.current_phase,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, house, id, user]);

  // -----------------------------------------------------------------------
  // Plans (Documents)
  // -----------------------------------------------------------------------

  async function loadDocuments() {
    setDocsLoading(true);
    try {
      const { data } = await supabase
        .from('frm_documents')
        .select('*')
        .eq('lot_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (data) setDocuments(data);
      setDocsLoaded(true);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocsLoading(false);
    }
  }

  const openDocument = async (doc: DocumentRow) => {
    if (!doc.file_url) {
      Alert.alert('No Link', 'This document does not have a viewable link.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(doc.file_url);
      if (supported) {
        await Linking.openURL(doc.file_url);
      } else {
        Alert.alert('Cannot Open', 'Unable to open this document.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open document.');
    }
  };

  // -----------------------------------------------------------------------
  // Tasks (Checklist)
  // -----------------------------------------------------------------------

  async function loadChecklist() {
    setTasksLoading(true);
    try {
      const { data } = await supabase
        .from('frm_house_items')
        .select('id, title')
        .eq('lot_id', id)
        .eq('type', 'checklist')
        .eq('status', 'resolved');

      if (data) setChecklistCompletions(data);
      setTasksLoaded(true);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setTasksLoading(false);
    }
  }

  const currentPhaseId = house?.current_phase || 'floor_1';
  const checklistItems = PHASE_CHECKLISTS[currentPhaseId] || [];
  const completedTitles = new Set(checklistCompletions.map((c) => c.title));

  const toggleChecklistItem = useCallback(
    async (itemTitle: string) => {
      if (!user?.id || !house) return;

      const isCompleted = completedTitles.has(itemTitle);

      try {
        if (isCompleted) {
          // Delete the completion record
          const match = checklistCompletions.find((c) => c.title === itemTitle);
          if (match) {
            await supabase.from('frm_house_items').delete().eq('id', match.id);
            setChecklistCompletions((prev) => prev.filter((c) => c.id !== match.id));
          }
        } else {
          // Insert a new completion record
          const { data } = await supabase
            .from('frm_house_items')
            .insert({
              lot_id: id,
              phase_id: currentPhaseId,
              type: 'checklist',
              severity: 'low',
              title: itemTitle,
              photo_url: 'checklist://auto',
              reported_by: user.id,
              status: 'resolved',
              resolved_by: user.id,
              resolved_at: new Date().toISOString(),
              blocking: false,
            })
            .select('id, title')
            .single();

          if (data) {
            setChecklistCompletions((prev) => [...prev, data]);
          }
        }
      } catch (error) {
        console.error('Error toggling checklist:', error);
      }
    },
    [user, house, id, currentPhaseId, completedTitles, checklistCompletions],
  );

  // -----------------------------------------------------------------------
  // Timeline (Phase Progress)
  // -----------------------------------------------------------------------

  async function loadTimeline() {
    setTimelineLoading(true);
    try {
      const { data } = await supabase
        .from('frm_phase_assignments')
        .select('id, lot_id, phase_id, status, started_at, completed_at')
        .eq('lot_id', id);

      if (data) setAssignments(data);
      setTimelineLoaded(true);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setTimelineLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Loading & Error States
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading lot details...</Text>
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="home-outline" size={64} color="#D1D5DB" />
        <Text style={styles.errorText}>Lot not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const lotColor = getLotColor(house.lot_number);
  const phaseName = getPhaseName(house.current_phase);
  const progress = house.progress_percentage;

  const completedCount = checklistItems.filter((t) => completedTitles.has(t)).length;
  const totalCount = checklistItems.length;
  const checklistPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // -----------------------------------------------------------------------
  // Render — Tab Contents
  // -----------------------------------------------------------------------

  function renderChat() {
    if (messagesLoading && !messagesLoaded) {
      return (
        <View style={styles.tabLoading}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.tabLoadingText}>Loading messages...</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={200}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Messages Yet</Text>
              <Text style={styles.emptySubtext}>
                Send a message to start the conversation
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            const isSystem = item.sender_type === 'system';

            if (isSystem) {
              return (
                <View style={styles.systemMessageRow}>
                  <Text style={styles.systemMessageText}>{item.content}</Text>
                  <Text style={styles.systemMessageTime}>
                    {formatMessageTime(item.created_at)}
                  </Text>
                </View>
              );
            }

            return (
              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.myMessage : styles.otherMessage,
                ]}
              >
                {!isMe && (
                  <View style={styles.senderRow}>
                    <Text style={styles.senderName}>{item.sender_name}</Text>
                    <View style={styles.senderBadge}>
                      <Text style={styles.senderBadgeText}>{item.sender_type}</Text>
                    </View>
                  </View>
                )}
                <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                  {item.content}
                </Text>
                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                  {formatMessageTime(item.created_at)}
                </Text>
              </View>
            );
          }}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.inputIcon}
            onPress={() =>
              router.push(`/camera?houseId=${id}&phaseId=${house.current_phase || 'floor_1'}`)
            }
          >
            <Ionicons name="camera" size={22} color="#6B7280" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />

          {inputText.trim() ? (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.inputIcon}>
              <Ionicons name="mic" size={22} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  function renderPlans() {
    if (docsLoading && !docsLoaded) {
      return (
        <View style={styles.tabLoading}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.tabLoadingText}>Loading documents...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {/* Section header */}
        <Text style={styles.sectionHeader}>DOCUMENTS ({documents.length})</Text>

        {documents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySubtext}>
              Documents will appear here when added by your supervisor
            </Text>
          </View>
        ) : (
          documents.map((doc) => {
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
              (doc.file_type || '').toLowerCase(),
            );
            const isPdf = (doc.file_type || '').toLowerCase() === 'pdf';

            const iconName: keyof typeof Ionicons.glyphMap = isPdf
              ? 'document-text'
              : isImage
                ? 'image'
                : 'document';
            const iconColor = isPdf ? '#EF4444' : isImage ? '#3B82F6' : '#6B7280';

            const sizeStr = formatFileSize(doc.file_size);
            const dateStr = formatMessageDate(doc.created_at);
            const subtitle = [doc.file_type?.toUpperCase(), sizeStr, dateStr]
              .filter(Boolean)
              .join(' \u00B7 ');

            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onPress={() => openDocument(doc)}
                activeOpacity={0.7}
              >
                <View style={[styles.docIconBg, { backgroundColor: `${iconColor}15` }]}>
                  <Ionicons name={iconName} size={22} color={iconColor} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={styles.docMeta} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  function renderTasks() {
    if (tasksLoading && !tasksLoaded) {
      return (
        <View style={styles.tabLoading}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.tabLoadingText}>Loading checklist...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {/* Checklist header */}
        <Text style={styles.checklistTitle}>{phaseName} Checklist</Text>
        <Text style={styles.checklistSubtitle}>
          {completedCount} of {totalCount} complete
        </Text>

        {/* Progress bar */}
        <View style={styles.checklistProgressRow}>
          <Text style={styles.checklistPct}>{checklistPct}%</Text>
          <View style={styles.checklistBarOuter}>
            <View
              style={[styles.checklistBarInner, { width: `${checklistPct}%` }]}
            />
          </View>
        </View>

        {/* Items */}
        <View style={styles.checklistCard}>
          {checklistItems.map((item, idx) => {
            const isChecked = completedTitles.has(item);
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.checklistItem,
                  idx < checklistItems.length - 1 && styles.checklistItemBorder,
                ]}
                onPress={() => toggleChecklistItem(item)}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={isChecked ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={isChecked ? '#10B981' : '#D1D5DB'}
                />
                <Text
                  style={[
                    styles.checklistItemText,
                    isChecked && styles.checklistItemChecked,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  function renderTimeline() {
    if (timelineLoading && !timelineLoaded) {
      return (
        <View style={styles.tabLoading}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.tabLoadingText}>Loading timeline...</Text>
        </View>
      );
    }

    const assignmentMap = new Map(assignments.map((a) => [a.phase_id, a]));

    return (
      <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        <View style={styles.timelineCard}>
          {FRAMING_PHASES.map((phase, idx) => {
            const assignment = assignmentMap.get(phase.id);
            const status = assignment?.status || 'pending';
            const isCurrent = house.current_phase === phase.id;
            const isCompleted = status === 'completed';
            const isPending = !isCompleted && !isCurrent;
            const isLast = idx === FRAMING_PHASES.length - 1;

            // Dot colors
            let dotColor = '#D1D5DB'; // gray outline for pending
            let dotFilled = false;
            if (isCompleted) {
              dotColor = '#10B981';
              dotFilled = true;
            } else if (isCurrent) {
              dotColor = '#7C3AED';
              dotFilled = true;
            }

            // Status text
            let statusText = '';
            if (isCompleted && assignment?.completed_at) {
              try {
                statusText = `Completed \u00B7 ${format(new Date(assignment.completed_at), 'MMM d')}`;
              } catch {
                statusText = 'Completed';
              }
            }

            return (
              <View key={phase.id} style={styles.tlRow}>
                {/* Left spine */}
                <View style={styles.tlSpine}>
                  <View
                    style={[
                      styles.tlDot,
                      dotFilled
                        ? { backgroundColor: dotColor }
                        : { borderColor: dotColor, borderWidth: 2, backgroundColor: '#fff' },
                    ]}
                  />
                  {!isLast && (
                    <View
                      style={[
                        styles.tlLine,
                        { backgroundColor: isCompleted ? '#10B981' : '#E5E7EB' },
                      ]}
                    />
                  )}
                </View>

                {/* Content */}
                <View style={styles.tlContent}>
                  <Text
                    style={[
                      styles.tlPhaseName,
                      isPending && styles.tlPhaseNamePending,
                      (isCompleted || isCurrent) && styles.tlPhaseNameBold,
                    ]}
                  >
                    {phase.name}
                  </Text>

                  {isCurrent && (
                    <View style={styles.tlInProgressRow}>
                      <View style={styles.tlInProgressBadge}>
                        <Text style={styles.tlInProgressText}>IN PROGRESS</Text>
                      </View>
                      <Text style={styles.tlProgressPct}>{progress}% complete</Text>
                    </View>
                  )}

                  {isCompleted && statusText !== '' && (
                    <Text style={styles.tlCompletedText}>{statusText}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  // -----------------------------------------------------------------------
  // Render — Main Layout
  // -----------------------------------------------------------------------

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          {/* Top row: back, lot circle + info, camera icon */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#101828" />
            </TouchableOpacity>

            <View style={[styles.lotCircle, { backgroundColor: lotColor }]}>
              <Text style={styles.lotCircleText}>{house.lot_number}</Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Lot {house.lot_number}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {'\u2022'} {phaseName} {'\u00B7'} {progress}%
              </Text>
            </View>

            <TouchableOpacity
              style={styles.headerCameraBtn}
              onPress={() =>
                router.push(
                  `/camera?houseId=${id}&phaseId=${house.current_phase || 'floor_1'}`,
                )
              }
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="eye" size={22} color={ACCENT} />
            </TouchableOpacity>
          </View>

          {/* Tab pills */}
          <View style={styles.tabPillRow}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={isActive ? '#fff' : '#374151'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[styles.tabPillText, isActive && styles.tabPillTextActive]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* TAB CONTENT */}
        <View style={styles.tabContent}>
          {activeTab === 'chat' && renderChat()}
          {activeTab === 'plans' && renderPlans()}
          {activeTab === 'tasks' && renderTasks()}
          {activeTab === 'timeline' && renderTimeline()}
        </View>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  // -----------------------------------------------------------------------
  // Header
  // -----------------------------------------------------------------------

  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerBackBtn: {
    marginRight: 12,
  },
  lotCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lotCircleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  headerCameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Tab pills
  tabPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabPillActive: {
    backgroundColor: '#1F2937',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },

  // -----------------------------------------------------------------------
  // Tab content area
  // -----------------------------------------------------------------------

  tabContent: {
    flex: 1,
  },
  tabLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLoadingText: {
    color: '#6B7280',
    marginTop: 8,
    fontSize: 13,
  },
  tabScroll: {
    flex: 1,
  },
  tabScrollContent: {
    padding: 16,
  },

  // -----------------------------------------------------------------------
  // Empty state (shared)
  // -----------------------------------------------------------------------

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#101828',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // -----------------------------------------------------------------------
  // Chat
  // -----------------------------------------------------------------------

  chatContainer: {
    flex: 1,
  },
  chatList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
  },
  senderBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  senderBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  messageText: {
    fontSize: 15,
    color: '#101828',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  systemMessageRow: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  systemMessageTime: {
    fontSize: 10,
    color: '#D1D5DB',
    marginTop: 2,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  inputIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#101828',
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // -----------------------------------------------------------------------
  // Plans (Documents)
  // -----------------------------------------------------------------------

  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  docIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 3,
  },
  docMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // -----------------------------------------------------------------------
  // Tasks (Checklist)
  // -----------------------------------------------------------------------

  checklistTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 4,
  },
  checklistSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  checklistProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  checklistPct: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
    minWidth: 36,
  },
  checklistBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  checklistBarInner: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  checklistItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checklistItemText: {
    flex: 1,
    fontSize: 15,
    color: '#101828',
    lineHeight: 20,
  },
  checklistItemChecked: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },

  // -----------------------------------------------------------------------
  // Timeline (Phase Progress)
  // -----------------------------------------------------------------------

  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  tlRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  tlSpine: {
    alignItems: 'center',
    width: 32,
  },
  tlDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  tlLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },
  tlContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  tlPhaseName: {
    fontSize: 15,
    fontWeight: '400',
    color: '#101828',
  },
  tlPhaseNamePending: {
    color: '#9CA3AF',
  },
  tlPhaseNameBold: {
    fontWeight: '600',
  },
  tlInProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  tlInProgressBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tlInProgressText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tlProgressPct: {
    fontSize: 12,
    color: '#6B7280',
  },
  tlCompletedText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
