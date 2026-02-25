/**
 * Button — Shared UI component
 *
 * Variants: primary (green), secondary (neutral outline), danger, ghost
 * Sizes: sm, md, lg
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}` as keyof typeof styles],
    styles[`button_${size}` as keyof typeof styles],
    (disabled || loading) && styles.button_disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${variant}` as keyof typeof styles],
    styles[`buttonText_${size}` as keyof typeof styles],
    (disabled || loading) && styles.buttonText_disabled,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : '#0F766E'}
        />
      ) : (
        <>
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  button_primary: { backgroundColor: '#0F766E' },
  button_secondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E7EE' },
  button_danger: { backgroundColor: '#DC2626' },
  button_ghost: { backgroundColor: 'transparent' },

  button_sm: { paddingVertical: 8, paddingHorizontal: 12 },
  button_md: { paddingVertical: 12, paddingHorizontal: 20 },
  button_lg: { paddingVertical: 16, paddingHorizontal: 24 },

  button_disabled: { opacity: 0.5 },

  buttonIcon: { marginRight: 8 },

  buttonText: { fontWeight: '600' },
  buttonText_primary: { color: '#FFFFFF' },
  buttonText_secondary: { color: '#101828' },
  buttonText_danger: { color: '#FFFFFF' },
  buttonText_ghost: { color: '#0F766E' },
  buttonText_sm: { fontSize: 14 },
  buttonText_md: { fontSize: 16 },
  buttonText_lg: { fontSize: 18 },
  buttonText_disabled: { opacity: 0.7 },
});
