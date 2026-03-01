/**
 * Add Note — Quick note templates + custom note
 *
 * Queries frm_lots, inserts to frm_timeline.
 * Enterprise v3 light theme. Preserves 8 quick templates.
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';

interface House {
  id: string;
  lot_number: string;
}

interface NoteTemplate {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  content: string;
  color: string;
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'material_delayed',
    icon: 'cube',
    label: 'Material Delayed',
    content: 'Material delivery delayed. Waiting for shipment.',
    color: '#F59E0B',
  },
  {
    id: 'snow_day',
    icon: 'snow',
    label: 'Snow Day',
    content: 'Work suspended due to snow/weather conditions.',
    color: '#60A5FA',
  },
  {
    id: 'rain_day',
    icon: 'rainy',
    label: 'Rain Day',
    content: 'Work suspended due to rain/weather conditions.',
    color: '#6B7280',
  },
  {
    id: 'equipment_issue',
    icon: 'construct',
    label: 'Equipment Issue',
    content: 'Work paused due to equipment malfunction.',
    color: '#EF4444',
  },
  {
    id: 'inspection_pending',
    icon: 'search',
    label: 'Inspection Pending',
    content: 'Waiting for inspection before proceeding to next phase.',
    color: '#8B5CF6',
  },
  {
    id: 'subcontractor_delay',
    icon: 'people',
    label: 'Sub Delay',
    content: 'Subcontractor not available. Rescheduling.',
    color: '#F97316',
  },
  {
    id: 'material_issue',
    icon: 'warning',
    label: 'Material Issue',
    content: 'Issue with material quality or specifications.',
    color: '#EF4444',
  },
  {
    id: 'on_track',
    icon: 'checkmark-circle',
    label: 'On Track',
    content: 'Work progressing as expected. No issues.',
    color: '#10B981',
  },
];

const ACCENT = '#0F766E';

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadHouse();
  }, [id]);

  async function loadHouse() {
    try {
      const { data } = await supabase
        .from('frm_lots')
        .select('id, lot_number')
        .eq('id', id)
        .single();

      if (data) setHouse(data);
    } catch (error) {
      console.error('Error loading house:', error);
    } finally {
      setLoading(false);
    }
  }

  const selectTemplate = (template: NoteTemplate) => {
    setSelectedTemplate(template);
    setCustomNote('');
  };

  const clearSelection = () => {
    setSelectedTemplate(null);
    setAdditionalNote('');
  };

  const submitNote = async () => {
    const noteContent = selectedTemplate
      ? (additionalNote ? `${selectedTemplate.content}\n\n${additionalNote}` : selectedTemplate.content)
      : customNote.trim();

    if (!noteContent) {
      Alert.alert('Empty Note', 'Please select a template or write a custom note.');
      return;
    }

    setSubmitting(true);

    try {
      const title = selectedTemplate ? selectedTemplate.label : 'Note';

      const { error } = await supabase
        .from('frm_timeline')
        .insert({
          lot_id: id,
          event_type: 'note',
          title,
          description: noteContent,
          source: 'field',
          metadata: selectedTemplate
            ? { template_id: selectedTemplate.id }
            : null,
        });

      if (error) throw error;

      Alert.alert(
        'Note Added',
        'Your note has been added to the lot timeline.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting note:', error);
      Alert.alert('Error', 'Failed to add note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Add Note - Lot ${house?.lot_number || ''}` }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Quick Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Notes</Text>
          <Text style={styles.sectionSubtitle}>
            Tap a template to add a pre-written note
          </Text>

          <View style={styles.templatesGrid}>
            {NOTE_TEMPLATES.map(template => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate?.id === template.id && {
                    borderColor: template.color,
                    backgroundColor: '#F0FDFA',
                  },
                ]}
                onPress={() => selectTemplate(template)}
                activeOpacity={0.7}
              >
                <View style={[styles.templateIconBg, { backgroundColor: `${template.color}20` }]}>
                  <Ionicons name={template.icon} size={22} color={template.color} />
                </View>
                <Text style={styles.templateLabel}>{template.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Template Preview */}
        {selectedTemplate && (
          <View style={styles.section}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <TouchableOpacity onPress={clearSelection}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.previewCard, { borderLeftColor: selectedTemplate.color }]}>
              <View style={styles.previewTitleRow}>
                <Ionicons name={selectedTemplate.icon} size={20} color={selectedTemplate.color} />
                <Text style={styles.previewTitle}>{selectedTemplate.label}</Text>
              </View>
              <Text style={styles.previewContent}>{selectedTemplate.content}</Text>
            </View>

            <Text style={styles.additionalLabel}>Add details (optional)</Text>
            <TextInput
              style={styles.additionalInput}
              placeholder="Add more context..."
              placeholderTextColor="#9CA3AF"
              value={additionalNote}
              onChangeText={setAdditionalNote}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Custom Note */}
        {!selectedTemplate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Or Write Custom Note</Text>

            <TextInput
              style={styles.customInput}
              placeholder="Write your note here..."
              placeholderTextColor="#9CA3AF"
              value={customNote}
              onChangeText={setCustomNote}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedTemplate && !customNote.trim()) && styles.submitButtonDisabled,
          ]}
          onPress={submitNote}
          disabled={submitting || (!selectedTemplate && !customNote.trim())}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Note to Timeline</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  // Templates Grid
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  templateIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#101828',
    textAlign: 'center',
  },
  // Preview
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    flex: 1,
  },
  previewContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  // Additional
  additionalLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  additionalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    color: '#101828',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Custom
  customInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    color: '#101828',
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Submit
  submitButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
