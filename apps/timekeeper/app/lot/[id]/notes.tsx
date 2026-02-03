/**
 * Notes Screen - OnSite Timekeeper
 *
 * Pre-written note templates for quick status updates
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../src/constants/colors';
import { supabase } from '../../../src/lib/supabase';

interface House {
  id: string;
  lot_number: string;
}

interface NoteTemplate {
  id: string;
  icon: string;
  label: string;
  content: string;
  color: string;
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'material_delayed',
    icon: '📦',
    label: 'Material Delayed',
    content: 'Material delivery delayed. Waiting for shipment.',
    color: colors.amber,
  },
  {
    id: 'snow_day',
    icon: '❄️',
    label: 'Snow Day',
    content: 'Work suspended due to snow/weather conditions.',
    color: '#60A5FA',
  },
  {
    id: 'rain_day',
    icon: '🌧️',
    label: 'Rain Day',
    content: 'Work suspended due to rain/weather conditions.',
    color: colors.iconMuted,
  },
  {
    id: 'equipment_issue',
    icon: '🔧',
    label: 'Equipment Issue',
    content: 'Work paused due to equipment malfunction.',
    color: colors.error,
  },
  {
    id: 'inspection_pending',
    icon: '🔍',
    label: 'Inspection Pending',
    content: 'Waiting for inspection before proceeding to next phase.',
    color: '#8B5CF6',
  },
  {
    id: 'subcontractor_delay',
    icon: '👷',
    label: 'Sub Delay',
    content: 'Subcontractor not available. Rescheduling.',
    color: '#F97316',
  },
  {
    id: 'material_issue',
    icon: '⚠️',
    label: 'Material Issue',
    content: 'Issue with material quality or specifications.',
    color: colors.error,
  },
  {
    id: 'on_track',
    icon: '✅',
    label: 'On Track',
    content: 'Work progressing as expected. No issues.',
    color: colors.green,
  },
];

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadHouse();
    }
  }, [id]);

  async function loadHouse() {
    try {
      const { data } = await supabase
        .from('houses')
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
      const title = selectedTemplate
        ? selectedTemplate.label
        : 'Note';

      // Create timeline event
      const { error } = await supabase
        .from('timeline_events')
        .insert({
          house_id: id,
          event_type: 'note',
          title,
          description: noteContent,
          source: 'worker_app',
          metadata: selectedTemplate
            ? { template_id: selectedTemplate.id }
            : null,
        });

      if (error) throw error;

      Alert.alert(
        'Note Added',
        'Your note has been added to the lot timeline.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Add Note - Lot ${house?.lot_number || ''}`,
        }}
      />

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
                  selectedTemplate?.id === template.id && styles.templateCardSelected,
                  selectedTemplate?.id === template.id && { borderColor: template.color },
                ]}
                onPress={() => selectTemplate(template)}
                activeOpacity={0.7}
              >
                <Text style={styles.templateIcon}>{template.icon}</Text>
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
                <Text style={styles.previewIcon}>{selectedTemplate.icon}</Text>
                <Text style={styles.previewTitle}>{selectedTemplate.label}</Text>
              </View>
              <Text style={styles.previewContent}>{selectedTemplate.content}</Text>
            </View>

            {/* Additional notes */}
            <Text style={styles.additionalLabel}>Add details (optional)</Text>
            <TextInput
              style={styles.additionalInput}
              placeholder="Add more context..."
              placeholderTextColor={colors.iconMuted}
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
              placeholderTextColor={colors.iconMuted}
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
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.submitButtonText}>Add Note to Timeline</Text>
            </>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  // Templates Grid
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  templateCardSelected: {
    backgroundColor: colors.background,
  },
  templateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  // Preview
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clearButton: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  previewContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Additional
  additionalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  additionalInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Custom
  customInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Submit
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
