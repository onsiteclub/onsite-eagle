/**
 * Plans Tab — Construction plans + Agenda (sub-toggle).
 *
 * Two views toggled at the top:
 * 1. Plans: Received construction plans, photo upload, PDF viewer
 * 2. Agenda: Site calendar (view-only for worker), house deadlines
 *
 * Data: @onsite/media (plans), @onsite/agenda (calendar)
 * UI: Native (React Native)
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@onsite/tokens';
import { AgendaView } from '../../src/screens/agenda/AgendaView';
import { PlansViewer } from '../../src/screens/plans/PlansViewer';

type SubView = 'plans' | 'agenda';

export default function PlansTab() {
  const [activeView, setActiveView] = useState<SubView>('plans');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {activeView === 'plans' ? 'Plans' : 'Agenda'}
        </Text>

        {/* Sub-toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'plans' && styles.toggleBtnActive]}
            onPress={() => setActiveView('plans')}
          >
            <Text style={[styles.toggleText, activeView === 'plans' && styles.toggleTextActive]}>
              Plans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeView === 'agenda' && styles.toggleBtnActive]}
            onPress={() => setActiveView('agenda')}
          >
            <Text style={[styles.toggleText, activeView === 'agenda' && styles.toggleTextActive]}>
              Agenda
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {activeView === 'plans' ? (
        <PlansViewer />
      ) : (
        <AgendaView />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
});
