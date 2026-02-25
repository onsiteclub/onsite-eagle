/**
 * Config — Settings + Availability Toggle
 *
 * - Availability toggle (ON/OFF) — main feature
 * - QR Code Scanner (link to site assignment)
 * - Notifications
 * - Sign Out
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';

const ACCENT = '#0F766E';

export default function ConfigScreen() {
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [operatorName, setOperatorName] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [siteName, setSiteName] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      setOperatorEmail(auth.user.email || '');

      // Load profile
      const { data: profile } = await supabase
        .from('core_profiles')
        .select('full_name, first_name')
        .eq('id', auth.user.id)
        .maybeSingle();

      setOperatorName(profile?.full_name || profile?.first_name || '');

      // Load assignment + availability
      const { data: assignment } = await supabase
        .from('egl_operator_assignments')
        .select('id, site_id, is_available, site:egl_sites(name)')
        .eq('operator_id', auth.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (assignment) {
        setAssignmentId(assignment.id);
        setIsAvailable(assignment.is_available !== false);
        setSiteName((assignment as any).site?.name || null);
      }
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability(value: boolean) {
    if (!assignmentId) {
      Alert.alert('Erro', 'Nenhum site atribuido.');
      return;
    }

    setToggling(true);
    setIsAvailable(value);

    try {
      const { error } = await supabase
        .from('egl_operator_assignments')
        .update({
          is_available: value,
          available_since: value ? new Date().toISOString() : null,
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error toggling availability:', error);
        setIsAvailable(!value); // revert
        Alert.alert('Erro', 'Falha ao atualizar disponibilidade');
      }
    } catch {
      setIsAvailable(!value);
      Alert.alert('Erro', 'Algo deu errado');
    } finally {
      setToggling(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuracoes</Text>
      </View>

      {/* Operator Info */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {operatorName ? operatorName.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{operatorName || 'Operator'}</Text>
          <Text style={styles.profileEmail}>{operatorEmail}</Text>
          {siteName && (
            <Text style={styles.profileSite}>{siteName}</Text>
          )}
        </View>
      </View>

      {/* Availability Toggle — Primary Feature */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DISPONIBILIDADE</Text>
        <View style={[
          styles.availabilityCard,
          isAvailable ? styles.availableCard : styles.unavailableCard,
        ]}>
          <View style={styles.availabilityContent}>
            <Ionicons
              name={isAvailable ? 'flash' : 'flash-off'}
              size={28}
              color={isAvailable ? '#16A34A' : '#DC2626'}
            />
            <View style={styles.availabilityText}>
              <Text style={[
                styles.availabilityLabel,
                { color: isAvailable ? '#16A34A' : '#DC2626' }
              ]}>
                {isAvailable ? 'ONLINE' : 'OFFLINE'}
              </Text>
              <Text style={styles.availabilityHint}>
                {isAvailable
                  ? 'Recebendo pedidos normalmente'
                  : 'Pedidos irao para a fila automaticamente'
                }
              </Text>
            </View>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            disabled={toggling || !assignmentId}
            trackColor={{ false: '#FEE2E2', true: '#BBF7D0' }}
            thumbColor={isAvailable ? '#16A34A' : '#DC2626'}
          />
        </View>
      </View>

      {/* Settings List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GERAL</Text>

        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="qr-code" size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingLabel}>Scanner QR Code</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="notifications" size={20} color="#D97706" />
              </View>
              <Text style={styles.settingLabel}>Notificacoes</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
              thumbColor={notificationsEnabled ? ACCENT : '#9CA3AF'}
            />
          </View>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="language" size={20} color="#6B7280" />
              </View>
              <Text style={styles.settingLabel}>Idioma</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Portugues</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="information-circle" size={20} color="#6B7280" />
              </View>
              <Text style={styles.settingLabel}>Sobre</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>v1.0.0</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.signOutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#101828',
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  profileSite: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  availableCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  unavailableCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  availabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  availabilityText: {
    flex: 1,
  },
  availabilityLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  availabilityHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#101828',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});
