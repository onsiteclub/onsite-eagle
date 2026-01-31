import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius, shadows } from '../../theme/spacing'
import { lotIcons } from '../../theme/icons'
import { ProgressBarCompact } from './ProgressBar'
import type { LotCardProps } from '../shared/types'

const STATUS_CONFIG = {
  not_started: { color: colors.status.notStarted, label: 'Não Iniciado' },
  in_progress: { color: colors.status.inProgress, label: 'Em Andamento' },
  delayed: { color: colors.status.delayed, label: 'Atrasado' },
  completed: { color: colors.status.completed, label: 'Concluído' },
  on_hold: { color: colors.status.onHold, label: 'Em Espera' },
}

export function LotCard({
  id,
  lotNumber,
  address,
  status,
  progress,
  currentPhase,
  icons,
  worker,
  deadline,
  onPress,
}: LotCardProps) {
  const statusConfig = STATUS_CONFIG[status]
  const isOverdue = deadline && new Date(deadline) < new Date() && status !== 'completed'

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: statusConfig.color },
        isOverdue && styles.cardOverdue,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.lotNumber}>Lote {lotNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Icons */}
        {icons && icons.length > 0 && (
          <View style={styles.icons}>
            {icons.slice(0, 4).map((iconKey, idx) => (
              <View key={idx} style={styles.iconBubble}>
                <Text style={styles.iconText}>
                  {lotIcons[iconKey as keyof typeof lotIcons] || '📌'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Address */}
      {address && <Text style={styles.address}>{address}</Text>}

      {/* Phase */}
      {currentPhase && (
        <View style={styles.phaseContainer}>
          <Text style={styles.phaseLabel}>Fase:</Text>
          <Text style={styles.phaseName}>{currentPhase}</Text>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressContainer}>
        <ProgressBarCompact progress={progress} color={statusConfig.color} />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Worker */}
        {worker && (
          <View style={styles.workerInfo}>
            <Text style={styles.workerIcon}>👷</Text>
            <Text style={styles.workerName}>{worker.name}</Text>
          </View>
        )}

        {/* Deadline */}
        {deadline && (
          <View style={[styles.deadlineInfo, isOverdue && styles.deadlineOverdue]}>
            <Text style={styles.deadlineIcon}>{isOverdue ? '⚠️' : '🎯'}</Text>
            <Text style={[styles.deadlineText, isOverdue && styles.deadlineTextOverdue]}>
              {formatDeadline(deadline)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

function formatDeadline(deadline: Date | string): string {
  const date = new Date(deadline)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d atrasado`
  } else if (diffDays === 0) {
    return 'Hoje'
  } else if (diffDays === 1) {
    return 'Amanhã'
  } else if (diffDays <= 7) {
    return `${diffDays} dias`
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderLeftWidth: 4,
    ...shadows.md,
  },
  cardOverdue: {
    borderLeftColor: colors.status.delayed,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  lotNumber: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  icons: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 12,
  },
  address: {
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[2],
  },
  phaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  phaseLabel: {
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    marginRight: spacing[1],
  },
  phaseName: {
    color: colors.brand.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  progressContainer: {
    marginBottom: spacing[3],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerIcon: {
    fontSize: 14,
    marginRight: spacing[1],
  },
  workerName: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  deadlineIcon: {
    fontSize: 12,
    marginRight: spacing[1],
  },
  deadlineText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.xs,
  },
  deadlineTextOverdue: {
    color: colors.status.delayed,
    fontWeight: typography.fontWeight.medium as any,
  },
})
