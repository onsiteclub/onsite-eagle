/**
 * Config — Worker settings, QR scanner, sign out
 *
 * Uses @onsite/auth for sign out.
 * Enterprise v3 light theme.
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@onsite/auth';

const ACCENT = '#0F766E';

export default function ConfigScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={32} color={ACCENT} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.email?.split('@')[0] || 'Worker'}
          </Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Worker</Text>
          </View>
        </View>
      </View>

      {/* Site Connection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Site Connection</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/scanner')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#F0FDFA' }]}>
            <Ionicons name="qr-code" size={20} color={ACCENT} />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Scan QR Code</Text>
            <Text style={styles.menuItemSubtitle}>Join a construction site</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>

        <View style={styles.menuItem}>
          <View style={[styles.menuIconBg, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Version</Text>
            <Text style={styles.menuItemSubtitle}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  content: {
    paddingBottom: 100,
  },
  // Header
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
  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
  },
  // Section
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
