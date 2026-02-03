import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
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
    color: '#F59E0B',
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
    color: '#6B7280',
  },
  {
    id: 'equipment_issue',
    icon: '🔧',
    label: 'Equipment Issue',
    content: 'Work paused due to equipment malfunction.',
    color: '#EF4444',
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
    color: '#EF4444',
  },
  {
    id: 'on_track',
    icon: '✅',
    label: 'On Track',
    content: 'Work progressing as expected. No issues.',
    color: '#10B981',
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
        <ActivityIndicator size="large" color="#10B981" />
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
                  { borderColor: selectedTemplate?.id === template.id ? template.color : '#374151' },
                ]}
                onPress={() => selectTemplate(template)}
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
              <View style={styles.previewHeader}>
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
              placeholderTextColor="#6B7280"
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
              placeholderTextColor="#6B7280"
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
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
  },
  templateCardSelected: {
    backgroundColor: '#374151',
  },
  templateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  previewIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  previewContent: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 8,
    lineHeight: 20,
  },
  // Additional
  additionalLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  additionalInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#374151',
  },
  // Custom
  customInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#374151',
  },
  // Submit
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
