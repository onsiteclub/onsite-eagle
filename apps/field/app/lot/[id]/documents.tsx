import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../../src/lib/supabase';

interface Document {
  id: string;
  title: string;
  description: string | null;
  source_link: string | null;
  event_type: string;
  created_at: string;
  metadata: {
    file_type?: string;
    category?: string;
    file_url?: string;
  } | null;
}

interface House {
  id: string;
  lot_number: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  plan: '📐',
  inspection: '📋',
  upgrade: '⬆️',
  photo: '📷',
  other: '📄',
};

const CATEGORY_LABELS: Record<string, string> = {
  plan: 'Plans & Drawings',
  inspection: 'Inspections',
  upgrade: 'Customer Upgrades',
  photo: 'Photos',
  other: 'Other Documents',
};

export default function DocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDocuments();
    }
  }, [id]);

  async function loadDocuments() {
    try {
      // Load house info
      const { data: houseData } = await supabase
        .from('houses')
        .select('id, lot_number')
        .eq('id', id)
        .single();

      if (houseData) setHouse(houseData);

      // Load documents from timeline_events where event_type = 'document'
      // or has source_link
      const { data: docsData } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('house_id', id)
        .or('event_type.eq.document,source_link.not.is.null')
        .order('created_at', { ascending: false });

      if (docsData) {
        setDocuments(docsData);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  const openDocument = async (doc: Document) => {
    const url = doc.source_link || doc.metadata?.file_url;

    if (!url) {
      Alert.alert('No Link', 'This document does not have a viewable link.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', 'Unable to open this document link.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open document.');
    }
  };

  // Group documents by category
  const groupedDocs = documents.reduce((acc, doc) => {
    const category = doc.metadata?.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  const categories = ['plan', 'inspection', 'upgrade', 'other'].filter(
    cat => groupedDocs[cat] && groupedDocs[cat].length > 0
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: `Lot ${house?.lot_number || ''} Documents`,
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>📂</Text>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>{documents.length} Documents</Text>
            <Text style={styles.summarySubtitle}>
              Plans, inspections, and attachments
            </Text>
          </View>
        </View>

        {documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>No Documents</Text>
            <Text style={styles.emptyText}>
              Documents and plans will appear here when they are added by the supervisor
            </Text>
          </View>
        ) : (
          <>
            {categories.map(category => (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>
                    {CATEGORY_ICONS[category] || '📄'}
                  </Text>
                  <Text style={styles.categoryTitle}>
                    {CATEGORY_LABELS[category] || category}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {groupedDocs[category].length}
                  </Text>
                </View>

                {groupedDocs[category].map(doc => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.documentCard}
                    onPress={() => openDocument(doc)}
                  >
                    <View style={styles.documentIcon}>
                      <Text style={styles.documentIconText}>
                        {doc.metadata?.file_type === 'pdf' ? '📕' : '📄'}
                      </Text>
                    </View>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentTitle} numberOfLines={2}>
                        {doc.title}
                      </Text>
                      {doc.description && (
                        <Text style={styles.documentDesc} numberOfLines={1}>
                          {doc.description}
                        </Text>
                      )}
                      <Text style={styles.documentDate}>
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <Text style={styles.documentArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Help text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpIcon}>💡</Text>
          <Text style={styles.helpText}>
            Tap a document to open it. Documents are added by your supervisor through the Monitor app.
          </Text>
        </View>

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
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  summaryIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Category
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  categoryCount: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Document Card
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentIconText: {
    fontSize: 22,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  documentDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  documentArrow: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 8,
  },
  // Help
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  helpIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
});
