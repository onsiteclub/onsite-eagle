import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'
import type { SpineTimelineProps, SpineItem } from '../shared/types'

const TYPE_ICONS: Record<SpineItem['type'], string> = {
  photo: '📷',
  document: '📄',
  note: '📝',
  milestone: '🎯',
  assignment: '👷',
  inspection: '🔍',
}

const ROLE_COLORS: Record<string, string> = {
  worker: colors.role.worker,
  foreman: colors.role.foreman,
  manager: colors.role.manager,
  system: colors.text.muted,
}

export function SpineTimeline({
  items,
  onItemPress,
  showSignatures = true,
  groupByDate = true,
}: SpineTimelineProps) {
  // Group items by date if enabled
  const groupedItems = groupByDate
    ? groupItemsByDate(items)
    : { all: items }

  return (
    <ScrollView style={styles.container}>
      {Object.entries(groupedItems).map(([date, dateItems]) => (
        <View key={date} style={styles.dateGroup}>
          {groupByDate && date !== 'all' && (
            <View style={styles.dateHeader}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>{date}</Text>
              <View style={styles.dateLine} />
            </View>
          )}

          {dateItems.map((item, index) => (
            <SpineItemCard
              key={item.id}
              item={item}
              isLast={index === dateItems.length - 1}
              onPress={() => onItemPress?.(item)}
              showSignature={showSignatures}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

function SpineItemCard({
  item,
  isLast,
  onPress,
  showSignature,
}: {
  item: SpineItem
  isLast: boolean
  onPress?: () => void
  showSignature?: boolean
}) {
  const roleColor = ROLE_COLORS[item.author.role] || colors.text.muted
  const time = format(new Date(item.timestamp), 'HH:mm', { locale: ptBR })

  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Spine Line */}
      <View style={styles.spineColumn}>
        <View style={[styles.spineDot, { backgroundColor: roleColor }]}>
          <Text style={styles.spineIcon}>{TYPE_ICONS[item.type]}</Text>
        </View>
        {!isLast && <View style={styles.spineLine} />}
      </View>

      {/* Content Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemTime}>{time}</Text>
          </View>

          {/* Description */}
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}

          {/* Attachments Preview */}
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachments}>
              {item.attachments.slice(0, 3).map((att, idx) => (
                <View key={idx} style={styles.attachmentThumb}>
                  {att.type === 'image' && att.thumbnail ? (
                    <Image
                      source={{ uri: att.thumbnail }}
                      style={styles.thumbImage}
                    />
                  ) : (
                    <Text style={styles.attachmentIcon}>
                      {att.type === 'pdf' ? '📄' : '🔗'}
                    </Text>
                  )}
                </View>
              ))}
              {item.attachments.length > 3 && (
                <View style={styles.moreAttachments}>
                  <Text style={styles.moreText}>
                    +{item.attachments.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Author & Signature */}
          <View style={styles.cardFooter}>
            <View style={styles.authorInfo}>
              <View style={[styles.authorDot, { backgroundColor: roleColor }]} />
              <Text style={styles.authorName}>{item.author.name}</Text>
              <Text style={[styles.authorRole, { color: roleColor }]}>
                {item.author.role === 'worker' ? 'Trabalhador' :
                 item.author.role === 'foreman' ? 'Encarregado' :
                 item.author.role === 'manager' ? 'Gerente' : 'Sistema'}
              </Text>
            </View>

            {showSignature && item.signature && (
              <View style={styles.signature}>
                <Text style={styles.signatureIcon}>✓</Text>
                <Text style={styles.signatureText}>Assinado</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function groupItemsByDate(items: SpineItem[]): Record<string, SpineItem[]> {
  const groups: Record<string, SpineItem[]> = {}

  items.forEach((item) => {
    const date = format(new Date(item.timestamp), "dd 'de' MMMM", { locale: ptBR })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(item)
  })

  return groups
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: spacing[4],
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.background.tertiary,
  },
  dateText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    paddingHorizontal: spacing[3],
    textTransform: 'capitalize',
  },
  itemContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
  },
  spineColumn: {
    width: 40,
    alignItems: 'center',
  },
  spineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  spineIcon: {
    fontSize: 16,
  },
  spineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.background.tertiary,
    marginVertical: 4,
  },
  cardContainer: {
    flex: 1,
    paddingLeft: spacing[3],
    paddingBottom: spacing[3],
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  itemTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    flex: 1,
  },
  itemTime: {
    color: colors.text.muted,
    fontSize: typography.fontSize.xs,
    marginLeft: spacing[2],
  },
  itemDescription: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing[2],
  },
  attachments: {
    flexDirection: 'row',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  attachmentThumb: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  attachmentIcon: {
    fontSize: 20,
  },
  moreAttachments: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[2],
  },
  authorName: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    marginRight: spacing[1],
  },
  authorRole: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  signatureIcon: {
    color: colors.feedback.success,
    fontSize: 10,
    marginRight: 4,
  },
  signatureText: {
    color: colors.feedback.success,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
})
