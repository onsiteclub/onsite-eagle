/**
 * PermissionBanner — Alert banner for permission issues
 *
 * Types: error (red), warning (amber), info (blue)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PermissionBannerProps {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export function PermissionBanner({
  type,
  title,
  message,
  actionLabel,
  onAction,
  icon,
  secondaryAction,
}: PermissionBannerProps) {
  const typeStyles = type === 'error' ? errorStyles : type === 'warning' ? warningStyles : infoStyles;

  return (
    <View style={[baseStyles.container, typeStyles.container]}>
      {icon && <View style={baseStyles.iconContainer}>{icon}</View>}
      <View style={baseStyles.content}>
        <Text style={[baseStyles.title, typeStyles.title]}>{title}</Text>
        <Text style={[baseStyles.message, typeStyles.message]}>{message}</Text>
        <View style={baseStyles.actions}>
          <TouchableOpacity
            style={[baseStyles.button, typeStyles.button]}
            onPress={onAction}
            activeOpacity={0.7}
          >
            <Text style={[baseStyles.buttonText, typeStyles.buttonText]}>{actionLabel}</Text>
          </TouchableOpacity>
          {secondaryAction && (
            <TouchableOpacity
              style={baseStyles.secondaryButton}
              onPress={secondaryAction.onPress}
              activeOpacity={0.7}
            >
              <Text style={baseStyles.secondaryButtonText}>{secondaryAction.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', padding: 12, marginHorizontal: 16, marginVertical: 8,
    borderRadius: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  iconContainer: { marginRight: 12, paddingTop: 2 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  message: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  buttonText: { fontSize: 13, fontWeight: '600' },
  secondaryButton: { paddingVertical: 6, paddingHorizontal: 8 },
  secondaryButtonText: { fontSize: 13, color: '#667085', textDecorationLine: 'underline' },
});

const errorStyles = StyleSheet.create({
  container: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  title: { color: '#991B1B' }, message: { color: '#7F1D1D' },
  button: { backgroundColor: '#DC2626' }, buttonText: { color: '#FFFFFF' },
});

const warningStyles = StyleSheet.create({
  container: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  title: { color: '#92400E' }, message: { color: '#78350F' },
  button: { backgroundColor: '#D97706' }, buttonText: { color: '#FFFFFF' },
});

const infoStyles = StyleSheet.create({
  container: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
  title: { color: '#1E40AF' }, message: { color: '#1E3A8A' },
  button: { backgroundColor: '#2563EB' }, buttonText: { color: '#FFFFFF' },
});
