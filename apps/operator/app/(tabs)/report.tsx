/**
 * Report — Quick vehicle/equipment issue reporting
 *
 * Quick-tap buttons that post to site-level timeline (house_id = null).
 * Visible to Monitor (supervisor) but not tied to any specific lot.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import { sendMessage } from '@onsite/timeline';

const ACCENT = '#0F766E';

interface QuickReport {
  id: string;
  icon: string;
  label: string;
  message: string;
  color: string;
}

const QUICK_REPORTS: QuickReport[] = [
  {
    id: 'gas',
    icon: 'flash',
    label: 'Low Fuel',
    message: 'Need fuel',
    color: '#F59E0B',
  },
  {
    id: 'tire',
    icon: 'build',
    label: 'Flat Tire',
    message: 'Flat tire',
    color: '#DC2626',
  },
  {
    id: 'machine',
    icon: 'close-circle',
    label: 'Machine Down',
    message: 'Machine not working',
    color: '#7C3AED',
  },
  {
    id: 'accident',
    icon: 'medkit',
    label: 'Accident',
    message: 'Accident on site',
    color: '#B91C1C',
  },
  {
    id: 'road_block',
    icon: 'remove-circle',
    label: 'Road Block',
    message: 'Road blocked',
    color: '#EA580C',
  },
  {
    id: 'other',
    icon: 'create',
    label: 'Other',
    message: '',
    color: '#6B7280',
  },
];

export default function ReportScreen() {
  const { user } = useAuth();
  const operatorId = user?.id || null;
  const operatorName = user?.name || 'Operator';
  const [sending, setSending] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [sentReports, setSentReports] = useState<string[]>([]);

  useEffect(() => {
    if (operatorId) loadSiteInfo(operatorId);
  }, [operatorId]);

  async function loadSiteInfo(userId: string) {
    // Get operator's assigned site
    const { data: assignment } = await supabase
      .from('egl_operator_assignments')
      .select('site_id')
      .eq('operator_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (assignment?.site_id) {
      setSiteId(assignment.site_id);
    }
  }

  async function sendReport(report: QuickReport) {
    if (report.id === 'other') {
      setShowCustom(true);
      return;
    }

    await doSendReport(report.message, report.id);
  }

  async function sendCustomReport() {
    if (!customText.trim()) {
      Alert.alert('Error', 'Write a description of the issue');
      return;
    }
    await doSendReport(customText.trim(), 'other');
    setCustomText('');
    setShowCustom(false);
  }

  async function doSendReport(message: string, reportId: string) {
    if (!siteId) {
      Alert.alert('Error', 'No site assigned. Contact your supervisor.');
      return;
    }

    setSending(reportId);

    try {
      await sendMessage(supabase as never, {
        site_id: siteId,
        house_id: undefined, // site-level, not lot-specific
        sender_type: 'operator',
        sender_id: operatorId || undefined,
        sender_name: operatorName,
        content: `[REPORT] ${message}`,
        source_app: 'operator',
      });

      setSentReports(prev => [...prev, reportId]);

      // Brief success feedback, auto-clear after 3s
      setTimeout(() => {
        setSentReports(prev => prev.filter(id => id !== reportId));
      }, 3000);
    } catch (err) {
      console.error('Error sending report:', err);
      Alert.alert('Error', 'Failed to send. Try again.');
    } finally {
      setSending(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Report Issue</Text>
          <Text style={styles.headerSubtitle}>
            Tap to send to supervisor
          </Text>
        </View>

        {/* Quick Report Grid */}
        <View style={styles.grid}>
          {QUICK_REPORTS.map((report) => {
            const isSending = sending === report.id;
            const wasSent = sentReports.includes(report.id);

            return (
              <TouchableOpacity
                key={report.id}
                style={[
                  styles.reportCard,
                  wasSent && styles.reportCardSent,
                ]}
                onPress={() => sendReport(report)}
                disabled={isSending}
                activeOpacity={0.7}
              >
                {isSending ? (
                  <ActivityIndicator color={report.color} size="large" />
                ) : wasSent ? (
                  <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
                ) : (
                  <Ionicons name={report.icon as any} size={48} color={report.color} />
                )}
                <Text style={[
                  styles.reportLabel,
                  wasSent && styles.reportLabelSent,
                ]}>
                  {wasSent ? 'Sent!' : report.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Input */}
        {showCustom && (
          <View style={styles.customSection}>
            <Text style={styles.customTitle}>Describe the issue</Text>
            <TextInput
              style={styles.customInput}
              placeholder="E.g.: Chain broke, need a new one..."
              placeholderTextColor="#9CA3AF"
              value={customText}
              onChangeText={setCustomText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.customActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCustom(false); setCustomText(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, !customText.trim() && styles.sendBtnDisabled]}
                onPress={sendCustomReport}
                disabled={sending === 'other' || !customText.trim()}
              >
                {sending === 'other' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendBtnText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* No site warning */}
        {!siteId && (
          <View style={styles.warning}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.warningText}>
              No site assigned. Contact your supervisor to be linked to a site.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#101828',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  reportCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reportCardSent: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  reportLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    marginTop: 12,
    textAlign: 'center',
  },
  reportLabelSent: {
    color: '#16A34A',
  },
  customSection: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  customTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: '#F6F7F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#101828',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  sendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: ACCENT,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
});
