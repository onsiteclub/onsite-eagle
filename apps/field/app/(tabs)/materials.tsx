/**
 * Materials — Worker material requests by phase
 *
 * Flow: Phase cards → Material cards → Request form
 * Big button cards (2-col grid), not checklist style.
 * Categories from supervisor Shabba (2026-03-24).
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface MaterialRequest {
  id: string;
  material_name: string | null;
  quantity: number | null;
  unit: string | null;
  status: string;
  urgency_level: string | null;
  lot_id: string;
  phase_id: string;
  jobsite_id: string | null;
  requested_at: string;
  notes: string | null;
  lot?: { id: string; lot_number: string } | null;
}

interface AssignedLot {
  id: string;
  lot_number: string;
  current_phase: string | null;
  jobsite_id: string;
  status: string;
}

type ViewMode = 'phases' | 'materials' | 'requests';

// ───────────────────────────────────────────────
// Material Catalog (from Shabba — 2026-03-24)
// ───────────────────────────────────────────────

interface PhaseCategory {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: string[];
}

const PHASE_CATALOG: PhaseCategory[] = [
  {
    id: 'sub_floor_1',
    label: '1º Sub-Floor',
    icon: 'layers-outline',
    color: '#0F766E',
    items: [
      'Steel Beams / Posts',
      'Gasket / Tyvek / Poly',
      'Plating Lumber',
      'Joists',
      'Hangers / Brackets',
      'Temp. Stair',
      'Floor Sheathing',
    ],
  },
  {
    id: 'walls_1',
    label: '1º Walls',
    icon: 'home-outline',
    color: '#1D4ED8',
    items: [
      'Long Lumber',
      'Ext. Wall Studs',
      'Wall Sheathing',
      'Int. Wall Studs',
      'Landings Package',
      'Porch Package',
    ],
  },
  {
    id: 'sub_floor_2',
    label: '2º Sub-Floor',
    icon: 'copy-outline',
    color: '#7C3AED',
    items: [
      'Steel Beams',
      'Safety Package',
      'Joists',
      'Hangers',
      'Temp. Stair',
      'Floor Sheathing',
    ],
  },
  {
    id: 'walls_2',
    label: '2º Walls',
    icon: 'business-outline',
    color: '#B45309',
    items: [
      'Long Lumber',
      'Ext. Wall Studs',
      'Wall Sheathing',
      'Int. Wall Studs',
      'Bracing 2x4s',
    ],
  },
  {
    id: 'roofing',
    label: 'Roofing Load',
    icon: 'triangle-outline',
    color: '#DC2626',
    items: [
      'Safety Package',
      'Trusses',
      'Truss Lumber Package',
      'Truss Hangers',
      'Truss Sheathing',
      'H-Clips',
    ],
  },
  {
    id: 'backing',
    label: 'Backing',
    icon: 'construct-outline',
    color: '#059669',
    items: [
      'Strapping',
      'Backing Package',
      'Garage Jambs',
      'Finished Basement Pack',
      'Porch P.T. 2x6s',
      'Porch Posts Brackets',
    ],
  },
];

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const ACCENT = '#0F766E';
const BG = '#F6F7F9';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#101828';
const TEXT_GRAY = '#6B7280';
const SCREEN_W = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 16 * 2 - CARD_GAP) / 2;

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  requested:    { color: '#6B7280', label: 'Requested' },
  acknowledged: { color: '#8B5CF6', label: 'Acknowledged' },
  in_transit:   { color: '#06B6D4', label: 'In Transit' },
  delivered:    { color: '#3B82F6', label: 'Delivered' },
  cancelled:    { color: '#EF4444', label: 'Cancelled' },
};

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'boards', label: 'Boards' },
  { value: 'sheets', label: 'Sheets' },
  { value: 'bundles', label: 'Bundles' },
  { value: 'bags', label: 'Bags' },
  { value: 'rolls', label: 'Rolls' },
];

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', desc: '24+ hours', color: '#6B7280' },
  { value: 'medium', label: 'Medium', desc: 'Within the day', color: '#F59E0B' },
  { value: 'high', label: 'High', desc: 'Within hours', color: '#F97316' },
  { value: 'critical', label: 'Critical', desc: 'Blocking work NOW', color: '#EF4444' },
];

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export default function MaterialsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [assignedLots, setAssignedLots] = useState<AssignedLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Navigation state
  const [view, setView] = useState<ViewMode>('phases');
  const [selectedPhase, setSelectedPhase] = useState<PhaseCategory | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formLotId, setFormLotId] = useState('');
  const [formUrgency, setFormUrgency] = useState('medium');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formPhaseLabel, setFormPhaseLabel] = useState('');

  // Picker visibility
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showLotPicker, setShowLotPicker] = useState(false);
  const [showUrgencyPicker, setShowUrgencyPicker] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // ─────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────

  async function loadData() {
    try {
      if (!user) return;

      const { data: crewMemberships } = await supabase
        .from('frm_crew_workers')
        .select('crew_id')
        .eq('worker_id', user.id)
        .is('left_at', null);

      const crewIds = (crewMemberships || []).map(m => m.crew_id);
      let lotIds: string[] = [];

      if (crewIds.length > 0) {
        const { data: assignments } = await supabase
          .from('frm_phase_assignments')
          .select('lot_id')
          .in('crew_id', crewIds)
          .neq('status', 'cancelled');
        lotIds = [...new Set((assignments || []).map(a => a.lot_id))];
      }

      if (lotIds.length === 0) {
        const { data: allLots } = await supabase
          .from('frm_lots')
          .select('id, lot_number, current_phase, jobsite_id, status')
          .order('lot_number', { ascending: true });
        const lots = (allLots || []) as AssignedLot[];
        setAssignedLots(lots);
        lotIds = lots.map(l => l.id);
      } else {
        const { data: lotData } = await supabase
          .from('frm_lots')
          .select('id, lot_number, current_phase, jobsite_id, status')
          .in('id', lotIds)
          .order('lot_number', { ascending: true });
        setAssignedLots((lotData || []) as AssignedLot[]);
      }

      if (lotIds.length > 0) {
        await loadRequests(lotIds);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error loading materials data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRequests(lotIds: string[]) {
    const { data } = await supabase
      .from('frm_material_requests')
      .select(`
        id, material_name, quantity, unit, status, urgency_level,
        lot_id, phase_id, jobsite_id, requested_at, notes,
        lot:frm_lots(id, lot_number)
      `)
      .in('lot_id', lotIds)
      .is('deleted_at', null)
      .order('requested_at', { ascending: false });

    const normalized = (data || []).map((r: any) => ({
      ...r,
      lot: Array.isArray(r.lot) ? r.lot[0] : r.lot,
    }));
    setRequests(normalized);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('material-requests-field')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frm_material_requests',
      }, () => {
        if (assignedLots.length > 0) {
          loadRequests(assignedLots.map(l => l.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assignedLots]);

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  function selectPhase(phase: PhaseCategory) {
    setSelectedPhase(phase);
    setView('materials');
  }

  function selectMaterial(materialName: string, phaseLabel: string) {
    setFormName(materialName === 'Other (specify)' ? '' : materialName);
    setFormPhaseLabel(phaseLabel);
    setFormQuantity('');
    setFormUnit('pcs');
    setFormLotId(assignedLots.length === 1 ? assignedLots[0].id : '');
    setFormUrgency('medium');
    setFormNotes('');
    setShowUnitPicker(false);
    setShowLotPicker(false);
    setShowUrgencyPicker(false);
    setModalVisible(true);
  }

  function goBack() {
    if (view === 'materials') {
      setView('phases');
      setSelectedPhase(null);
    } else if (view === 'requests') {
      setView('phases');
    }
  }

  const pendingCount = requests.filter(r =>
    r.status === 'requested' || r.status === 'acknowledged' || r.status === 'in_transit'
  ).length;

  // ─────────────────────────────────────────────
  // Submit Request
  // ─────────────────────────────────────────────

  async function handleSubmit() {
    if (!formName.trim()) {
      Alert.alert('Missing Field', 'Please enter a material name.');
      return;
    }
    if (!formQuantity.trim() || isNaN(Number(formQuantity)) || Number(formQuantity) <= 0) {
      Alert.alert('Missing Field', 'Please enter a valid quantity.');
      return;
    }
    if (!formLotId) {
      Alert.alert('Missing Field', 'Please select a lot.');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const selectedLot = assignedLots.find(l => l.id === formLotId);
      const { error } = await supabase.from('frm_material_requests').insert({
        lot_id: formLotId,
        phase_id: selectedLot?.current_phase || 'frame_start',
        jobsite_id: selectedLot?.jobsite_id || null,
        material_name: `${formPhaseLabel ? `[${formPhaseLabel}] ` : ''}${formName.trim()}`,
        quantity: Number(formQuantity),
        unit: formUnit,
        urgency_level: formUrgency,
        urgency_reason: formNotes.trim() || null,
        requested_by: user.id,
        requested_by_name: user.name || user.email || 'Worker',
        status: 'requested',
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to create request.');
        return;
      }

      setModalVisible(false);
      Alert.alert('Request Sent', 'Your material request has been submitted.');
      if (assignedLots.length > 0) {
        await loadRequests(assignedLots.map(l => l.id));
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading materials...</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // Render: Phase Cards (2-col grid)
  // ─────────────────────────────────────────────

  function renderPhaseCards() {
    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
        }
      >
        <Text style={styles.sectionHint}>What do you need?</Text>

        <View style={styles.grid}>
          {PHASE_CATALOG.map((phase) => (
            <TouchableOpacity
              key={phase.id}
              style={styles.phaseCard}
              onPress={() => selectPhase(phase)}
              activeOpacity={0.7}
            >
              <View style={[styles.phaseIconWrap, { backgroundColor: phase.color + '15' }]}>
                <Ionicons name={phase.icon} size={28} color={phase.color} />
              </View>
              <Text style={styles.phaseLabel}>{phase.label}</Text>
              <Text style={styles.phaseCount}>{phase.items.length} items</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Requests link */}
        {requests.length > 0 && (
          <TouchableOpacity
            style={styles.requestsLink}
            onPress={() => setView('requests')}
            activeOpacity={0.7}
          >
            <View style={styles.requestsLinkLeft}>
              <Ionicons name="time-outline" size={20} color={TEXT_GRAY} />
              <Text style={styles.requestsLinkText}>My Requests</Text>
            </View>
            <View style={styles.requestsLinkRight}>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────
  // Render: Material Cards for selected phase
  // ─────────────────────────────────────────────

  function renderMaterialCards() {
    if (!selectedPhase) return null;

    const allItems = [...selectedPhase.items, 'Other (specify)'];

    return (
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.gridContainer}>
        <View style={styles.grid}>
          {allItems.map((item, idx) => {
            const isOther = item === 'Other (specify)';
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.materialCard, isOther && styles.materialCardOther]}
                onPress={() => selectMaterial(item, selectedPhase.label)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.materialIconWrap,
                  { backgroundColor: isOther ? '#F3F4F6' : selectedPhase.color + '12' },
                ]}>
                  <Ionicons
                    name={isOther ? 'create-outline' : 'cube-outline'}
                    size={22}
                    color={isOther ? TEXT_GRAY : selectedPhase.color}
                  />
                </View>
                <Text
                  style={[styles.materialLabel, isOther && styles.materialLabelOther]}
                  numberOfLines={2}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────
  // Render: My Requests list
  // ─────────────────────────────────────────────

  function renderRequestsList() {
    return (
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
        }
        renderItem={({ item }) => {
          const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.requested;
          const lotNumber = item.lot?.lot_number || '—';
          const timeStr = item.requested_at ? format(new Date(item.requested_at), 'MMM d, h:mm a') : '';

          return (
            <View style={styles.requestCard}>
              <View style={styles.requestCardTop}>
                <Text style={styles.requestName} numberOfLines={1}>
                  {item.material_name || 'Unknown'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
                  <Text style={styles.statusText}>{config.label}</Text>
                </View>
              </View>
              <View style={styles.requestMeta}>
                {item.quantity != null && (
                  <Text style={styles.metaText}>x{item.quantity}{item.unit ? ` ${item.unit}` : ''}</Text>
                )}
                <Text style={styles.metaDot}> · </Text>
                <Text style={styles.metaText}>Lot {lotNumber}</Text>
                {timeStr ? (
                  <>
                    <Text style={styles.metaDot}> · </Text>
                    <Text style={styles.metaText}>{timeStr}</Text>
                  </>
                ) : null}
              </View>
              {item.urgency_level && item.urgency_level !== 'medium' && (
                <View style={styles.urgencyRow}>
                  <Ionicons
                    name={item.urgency_level === 'critical' ? 'alert-circle' : 'warning'}
                    size={13}
                    color={item.urgency_level === 'critical' ? '#EF4444' : item.urgency_level === 'high' ? '#F97316' : '#6B7280'}
                  />
                  <Text style={[styles.urgencyText, {
                    color: item.urgency_level === 'critical' ? '#EF4444' : item.urgency_level === 'high' ? '#F97316' : '#6B7280',
                  }]}>
                    {URGENCY_OPTIONS.find(u => u.value === item.urgency_level)?.label || item.urgency_level}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Requests Yet</Text>
            <Text style={styles.emptyText}>Your material requests will appear here</Text>
          </View>
        }
      />
    );
  }

  // ─────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────

  const headerTitle =
    view === 'phases' ? 'Materials' :
    view === 'materials' && selectedPhase ? selectedPhase.label :
    'My Requests';

  const headerSub =
    view === 'phases' ? 'Select a phase to request materials' :
    view === 'materials' ? 'Tap to request' :
    `${requests.length} total`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {view !== 'phases' ? (
            <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
            </TouchableOpacity>
          ) : null}
          <View style={[styles.headerTextBlock, view !== 'phases' && { marginLeft: 12 }]}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{headerSub}</Text>
          </View>
          {view === 'phases' && pendingCount > 0 && (
            <TouchableOpacity
              style={styles.pendingButton}
              onPress={() => setView('requests')}
              activeOpacity={0.7}
            >
              <View style={styles.pendingDot} />
              <Text style={styles.pendingText}>{pendingCount} active</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {view === 'phases' && renderPhaseCards()}
      {view === 'materials' && renderMaterialCards()}
      {view === 'requests' && renderRequestsList()}

      {/* ─────────────────────────────────────── */}
      {/* Request Form Modal                      */}
      {/* ─────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Request</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Phase badge */}
            {formPhaseLabel ? (
              <View style={styles.phaseBadgeRow}>
                <View style={styles.phaseBadge}>
                  <Text style={styles.phaseBadgeText}>{formPhaseLabel}</Text>
                </View>
              </View>
            ) : null}

            {/* Material Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Material *</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g., 2x10 LVL Beam"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                returnKeyType="next"
                autoFocus={!formName}
              />
            </View>

            {/* Quantity */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Quantity *</Text>
              <TextInput
                style={styles.textInput}
                value={formQuantity}
                onChangeText={setFormQuantity}
                placeholder="8"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                returnKeyType="done"
                autoFocus={!!formName}
              />
            </View>

            {/* Unit Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowUnitPicker(!showUnitPicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerButtonText}>
                  {UNIT_OPTIONS.find(u => u.value === formUnit)?.label || formUnit}
                </Text>
                <Ionicons name={showUnitPicker ? 'chevron-up' : 'chevron-down'} size={18} color={TEXT_GRAY} />
              </TouchableOpacity>
              {showUnitPicker && (
                <View style={styles.optionsList}>
                  {UNIT_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionItem, formUnit === opt.value && styles.optionItemActive]}
                      onPress={() => { setFormUnit(opt.value); setShowUnitPicker(false); }}
                    >
                      <Text style={[styles.optionText, formUnit === opt.value && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      {formUnit === opt.value && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Lot Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Lot *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowLotPicker(!showLotPicker)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerButtonText, !formLotId && styles.pickerPlaceholder]}>
                  {formLotId
                    ? `Lot ${assignedLots.find(l => l.id === formLotId)?.lot_number || '—'}`
                    : 'Select a lot'}
                </Text>
                <Ionicons name={showLotPicker ? 'chevron-up' : 'chevron-down'} size={18} color={TEXT_GRAY} />
              </TouchableOpacity>
              {showLotPicker && (
                <View style={styles.optionsList}>
                  {assignedLots.length === 0 ? (
                    <View style={styles.optionItem}>
                      <Text style={styles.optionTextEmpty}>No lots assigned</Text>
                    </View>
                  ) : (
                    assignedLots.map(lot => (
                      <TouchableOpacity
                        key={lot.id}
                        style={[styles.optionItem, formLotId === lot.id && styles.optionItemActive]}
                        onPress={() => { setFormLotId(lot.id); setShowLotPicker(false); }}
                      >
                        <Text style={[styles.optionText, formLotId === lot.id && styles.optionTextActive]}>
                          Lot {lot.lot_number}
                        </Text>
                        {formLotId === lot.id && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Urgency Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Urgency</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowUrgencyPicker(!showUrgencyPicker)}
                activeOpacity={0.7}
              >
                <View style={styles.urgencyPickerLabel}>
                  <View style={[styles.urgencyDot, { backgroundColor: URGENCY_OPTIONS.find(u => u.value === formUrgency)?.color }]} />
                  <Text style={styles.pickerButtonText}>
                    {URGENCY_OPTIONS.find(u => u.value === formUrgency)?.label || 'Medium'}
                  </Text>
                </View>
                <Ionicons name={showUrgencyPicker ? 'chevron-up' : 'chevron-down'} size={18} color={TEXT_GRAY} />
              </TouchableOpacity>
              {showUrgencyPicker && (
                <View style={styles.optionsList}>
                  {URGENCY_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionItem, formUrgency === opt.value && styles.optionItemActive]}
                      onPress={() => { setFormUrgency(opt.value); setShowUrgencyPicker(false); }}
                    >
                      <View style={styles.urgencyOptionRow}>
                        <View style={[styles.urgencyDot, { backgroundColor: opt.color }]} />
                        <View>
                          <Text style={[styles.optionText, formUrgency === opt.value && styles.optionTextActive]}>
                            {opt.label}
                          </Text>
                          <Text style={styles.urgencyDesc}>{opt.desc}</Text>
                        </View>
                      </View>
                      {formUrgency === opt.value && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="Any additional details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Submit */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ───────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  loadingText: { color: TEXT_GRAY, marginTop: 12, fontSize: 14 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: TEXT_DARK },
  headerSubtitle: { fontSize: 14, color: TEXT_GRAY, marginTop: 2 },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  pendingText: { fontSize: 13, fontWeight: '600', color: '#92400E' },

  // Scroll / Grid
  scrollArea: { flex: 1 },
  gridContainer: { padding: 16, paddingBottom: 100 },
  sectionHint: { fontSize: 15, color: TEXT_GRAY, marginBottom: 16, textAlign: 'center' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  // Phase Cards
  phaseCard: {
    width: CARD_W,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  phaseIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  phaseLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  phaseCount: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginTop: 4,
  },

  // Material Cards
  materialCard: {
    width: CARD_W,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  materialCardOther: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  materialIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  materialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
    textAlign: 'center',
    lineHeight: 18,
  },
  materialLabelOther: {
    color: TEXT_GRAY,
    fontWeight: '500',
  },

  // Requests Link
  requestsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  requestsLinkLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestsLinkText: { fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  requestsLinkRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Request list
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  requestCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  requestCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestName: { fontSize: 16, fontWeight: '600', color: TEXT_DARK, flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  requestMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: TEXT_GRAY },
  metaDot: { fontSize: 13, color: '#D1D5DB' },
  urgencyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  urgencyText: { fontSize: 12, fontWeight: '500' },

  // Empty
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: TEXT_DARK, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: TEXT_GRAY, textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: BG },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: { fontSize: 16, color: '#EF4444', fontWeight: '500', width: 60 },
  modalTitle: { fontSize: 17, fontWeight: '600', color: TEXT_DARK },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 16, paddingBottom: 40 },
  modalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  // Phase badge in modal
  phaseBadgeRow: { marginBottom: 16 },
  phaseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phaseBadgeText: { fontSize: 13, fontWeight: '600', color: ACCENT },

  // Form
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: TEXT_DARK, marginBottom: 8 },
  textInput: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_DARK,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerButtonText: { fontSize: 16, color: TEXT_DARK },
  pickerPlaceholder: { color: '#9CA3AF' },
  optionsList: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 6,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemActive: { backgroundColor: `${ACCENT}10` },
  optionText: { fontSize: 15, color: TEXT_DARK },
  optionTextActive: { color: ACCENT, fontWeight: '600' },
  optionTextEmpty: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic' },
  urgencyPickerLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgencyDot: { width: 10, height: 10, borderRadius: 5 },
  urgencyOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  urgencyDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
