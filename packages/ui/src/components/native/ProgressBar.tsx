import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'
import type { ProgressBarProps } from '../shared/types'

export function ProgressBar({
  progress,
  phases,
  showLabel = true,
  size = 'md',
  color = colors.brand.primary,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const height = size === 'sm' ? 4 : size === 'md' ? 8 : 12

  return (
    <View style={styles.container}>
      {/* Progress Label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.progressText}>{Math.round(clampedProgress)}%</Text>
        </View>
      )}

      {/* Progress Bar */}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />

        {/* Phase Markers */}
        {phases && phases.length > 0 && (
          <View style={styles.markers}>
            {phases.map((phase, index) => {
              const position = ((index + 1) / phases.length) * 100
              return (
                <View
                  key={index}
                  style={[
                    styles.marker,
                    {
                      left: `${position}%`,
                      backgroundColor: phase.completed
                        ? colors.feedback.success
                        : phase.current
                        ? colors.feedback.warning
                        : colors.background.tertiary,
                    },
                  ]}
                />
              )
            })}
          </View>
        )}
      </View>

      {/* Phase Labels */}
      {phases && phases.length > 0 && (
        <View style={styles.phaseLabels}>
          {phases.map((phase, index) => (
            <Text
              key={index}
              style={[
                styles.phaseLabel,
                phase.current && styles.phaseLabelCurrent,
                phase.completed && styles.phaseLabelCompleted,
              ]}
              numberOfLines={1}
            >
              {index + 1}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

// Compact version for cards
export function ProgressBarCompact({
  progress,
  color = colors.brand.primary,
}: {
  progress: number
  color?: string
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <View style={styles.compactContainer}>
      <View style={styles.compactTrack}>
        <View
          style={[
            styles.compactFill,
            { width: `${clampedProgress}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.compactLabel}>{Math.round(clampedProgress)}%</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing[1],
  },
  progressText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
  },
  track: {
    width: '100%',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    borderRadius: borderRadius.full,
  },
  markers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  marker: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: '150%',
    borderRadius: 2,
    transform: [{ translateX: -2 }],
  },
  phaseLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    paddingHorizontal: spacing[1],
  },
  phaseLabel: {
    color: colors.text.muted,
    fontSize: typography.fontSize.xs,
    width: 20,
    textAlign: 'center',
  },
  phaseLabelCurrent: {
    color: colors.feedback.warning,
    fontWeight: typography.fontWeight.bold as any,
  },
  phaseLabelCompleted: {
    color: colors.feedback.success,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  compactTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  compactFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  compactLabel: {
    color: colors.brand.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    minWidth: 36,
    textAlign: 'right',
  },
})
