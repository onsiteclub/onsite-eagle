/**
 * Reports view — AI-generated reports for the site.
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
  Alert,
} from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

const ACCENT = '#0F766E';

interface Report {
  id: string;
  report_type: string;
  title: string;
  executive_summary: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  ai_confidence: number | null;
  created_at: string;
}

interface ReportsViewProps {
  siteId: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly_summary: 'Weekly Summary',
  monthly_summary: 'Monthly Summary',
  house_completion: 'House Completion',
  delay_alert: 'Delay Alert',
  risk_assessment: 'Risk Assessment',
};

export default function ReportsView({ siteId }: ReportsViewProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function fetchReports() {
    try {
      const { data, error } = await supabase
        .from('int_ai_reports')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReports((data as Report[]) || []);
    } catch (err) {
      console.error('[reports] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [siteId]);

  function renderReport({ item }: { item: Report }) {
    const typeLabel = REPORT_TYPE_LABELS[item.report_type] || item.report_type;
    const isExpanded = expanded === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpanded(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.date}>
            {format(new Date(item.created_at), 'MMM d, yyyy')}
          </Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {item.period_start && item.period_end && (
          <Text style={styles.period}>
            {format(new Date(item.period_start), 'MMM d')} - {format(new Date(item.period_end), 'MMM d')}
          </Text>
        )}

        {isExpanded && item.executive_summary && (
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Summary</Text>
            <Text style={styles.summaryText}>{item.executive_summary}</Text>
          </View>
        )}

        {item.ai_confidence != null && (
          <Text style={styles.confidence}>
            AI Confidence: {Math.round(item.ai_confidence * 100)}%
          </Text>
        )}
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

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No reports yet</Text>
        <Text style={styles.emptySubtitle}>
          AI reports will appear here after being generated from the Monitor web app.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reports}
      renderItem={renderReport}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchReports();
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 4,
  },
  period: {
    fontSize: 13,
    color: '#667085',
    marginBottom: 4,
  },
  summaryBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  confidence: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
});
