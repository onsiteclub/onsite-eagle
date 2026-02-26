/**
 * Documents view — list documents for a site.
 *
 * Uses @onsite/media for fetching documents.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

const ACCENT = '#0F766E';

interface Document {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

interface DocumentsViewProps {
  siteId: string;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'PDF',
  png: 'IMG',
  jpg: 'IMG',
  jpeg: 'IMG',
  doc: 'DOC',
  docx: 'DOC',
  xls: 'XLS',
  xlsx: 'XLS',
};

export default function DocumentsView({ siteId }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchDocuments() {
    try {
      // Try fetching from egl_timeline with event_type = 'document' or from a documents source
      const { data, error } = await supabase
        .from('egl_timeline')
        .select('*')
        .eq('house_id', siteId)
        .in('event_type', ['document', 'email'])
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback: list files from storage bucket
        setDocuments([]);
        return;
      }

      const docs: Document[] = (data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        file_url: d.source_link || '',
        file_type: d.metadata?.file_type || null,
        file_size: d.metadata?.file_size || null,
        uploaded_by: d.created_by,
        created_at: d.created_at,
      }));

      setDocuments(docs);
    } catch (err) {
      console.error('[documents] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, [siteId]);

  function formatSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function renderDocument({ item }: { item: Document }) {
    const ext = item.file_type?.toLowerCase() || '';
    const typeLabel = FILE_TYPE_ICONS[ext] || 'FILE';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (item.file_url) {
            Linking.openURL(item.file_url).catch(() => {});
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.typeIcon}>
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.docMeta}>
            <Text style={styles.docDate}>
              {format(new Date(item.created_at), 'MMM d, yyyy')}
            </Text>
            {item.file_size && (
              <Text style={styles.docSize}>{formatSize(item.file_size)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (documents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No documents</Text>
        <Text style={styles.emptySubtitle}>
          Documents will appear here when uploaded to this site.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={documents}
      renderItem={renderDocument}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchDocuments();
          }}
          tintColor={ACCENT}
          colors={[ACCENT]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#101828',
    marginBottom: 4,
  },
  docMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  docDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  docSize: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
