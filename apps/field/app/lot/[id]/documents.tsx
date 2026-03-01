/**
 * Documents — Lot documents grouped by category
 *
 * Queries frm_lots, frm_timeline.
 * Enterprise v3 light theme.
 */

import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plan: 'compass',
  inspection: 'clipboard',
  upgrade: 'arrow-up-circle',
  photo: 'camera',
  other: 'document',
};

const CATEGORY_LABELS: Record<string, string> = {
  plan: 'Plans & Drawings',
  inspection: 'Inspections',
  upgrade: 'Customer Upgrades',
  photo: 'Photos',
  other: 'Other Documents',
};

const ACCENT = '#0F766E';

export default function DocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDocuments();
  }, [id]);

  async function loadDocuments() {
    try {
      const { data: houseData } = await supabase
        .from('frm_lots')
        .select('id, lot_number')
        .eq('id', id)
        .single();

      if (houseData) setHouse(houseData);

      const { data: docsData } = await supabase
        .from('frm_timeline')
        .select('*')
        .eq('lot_id', id)
        .or('event_type.eq.document,source_link.not.is.null')
        .order('created_at', { ascending: false });

      if (docsData) setDocuments(docsData);
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

  const groupedDocs = documents.reduce((acc, doc) => {
    const category = doc.metadata?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  const categories = ['plan', 'inspection', 'upgrade', 'other'].filter(
    cat => groupedDocs[cat] && groupedDocs[cat].length > 0
  );

  return (
    <>
      <Stack.Screen options={{ title: `Lot ${house?.lot_number || ''} Documents` }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBg}>
            <Ionicons name="folder-open" size={24} color={ACCENT} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>{documents.length} Documents</Text>
            <Text style={styles.summarySubtitle}>
              Plans, inspections, and attachments
            </Text>
          </View>
        </View>

        {documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
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
                  <Ionicons
                    name={CATEGORY_ICONS[category] || 'document'}
                    size={18}
                    color={ACCENT}
                  />
                  <Text style={styles.categoryTitle}>
                    {CATEGORY_LABELS[category] || category}
                  </Text>
                  <View style={styles.categoryCountBadge}>
                    <Text style={styles.categoryCount}>
                      {groupedDocs[category].length}
                    </Text>
                  </View>
                </View>

                {groupedDocs[category].map(doc => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.documentCard}
                    onPress={() => openDocument(doc)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.documentIcon}>
                      <Ionicons
                        name={doc.metadata?.file_type === 'pdf' ? 'document-text' : 'document'}
                        size={22}
                        color="#6B7280"
                      />
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
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Help text */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle" size={18} color={ACCENT} />
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
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 14,
  },
  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
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
    gap: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    flex: 1,
  },
  categoryCountBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Document Card
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  documentIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F6F7F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 2,
  },
  documentDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Help
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 10,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
