import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'
import type { UserBadgeProps } from '../shared/types'

const ROLE_CONFIG = {
  worker: { color: colors.role.worker, label: 'Trabalhador', icon: '👷' },
  foreman: { color: colors.role.foreman, label: 'Encarregado', icon: '👔' },
  manager: { color: colors.role.manager, label: 'Gerente', icon: '💼' },
}

const SIZE_CONFIG = {
  sm: { avatar: 24, fontSize: typography.fontSize.xs },
  md: { avatar: 32, fontSize: typography.fontSize.sm },
  lg: { avatar: 40, fontSize: typography.fontSize.base },
}

export function UserBadge({
  name,
  role,
  avatar,
  timestamp,
  showRole = true,
  size = 'md',
}: UserBadgeProps) {
  const roleConfig = ROLE_CONFIG[role]
  const sizeConfig = SIZE_CONFIG[size]

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            width: sizeConfig.avatar,
            height: sizeConfig.avatar,
            borderRadius: sizeConfig.avatar / 2,
            borderColor: roleConfig.color,
          },
        ]}
      >
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={[
              styles.avatarImage,
              {
                width: sizeConfig.avatar,
                height: sizeConfig.avatar,
                borderRadius: sizeConfig.avatar / 2,
              },
            ]}
          />
        ) : (
          <Text style={styles.avatarIcon}>{roleConfig.icon}</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { fontSize: sizeConfig.fontSize }]}>{name}</Text>
          {showRole && (
            <View style={[styles.roleBadge, { backgroundColor: roleConfig.color }]}>
              <Text style={styles.roleText}>{roleConfig.label}</Text>
            </View>
          )}
        </View>

        {timestamp && (
          <Text style={styles.timestamp}>
            {format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
        )}
      </View>
    </View>
  )
}

// Compact inline version
export function UserBadgeInline({
  name,
  role,
}: {
  name: string
  role: 'worker' | 'foreman' | 'manager'
}) {
  const roleConfig = ROLE_CONFIG[role]

  return (
    <View style={styles.inlineContainer}>
      <View style={[styles.inlineDot, { backgroundColor: roleConfig.color }]} />
      <Text style={styles.inlineName}>{name}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    marginRight: spacing[2],
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  avatarIcon: {
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  name: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium as any,
  },
  roleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  timestamp: {
    color: colors.text.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[1],
  },
  inlineName: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
})
