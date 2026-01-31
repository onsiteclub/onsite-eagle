/**
 * Shared component types for OnSite Eagle
 */

import type { RoleColor } from '../../theme/colors'

// Spine Timeline Types
export interface SpineItem {
  id: string
  type: 'photo' | 'document' | 'note' | 'milestone' | 'assignment' | 'inspection'
  title: string
  description?: string
  timestamp: Date | string
  author: {
    id: string
    name: string
    role: 'worker' | 'foreman' | 'manager' | 'system'
    avatar?: string
  }
  signature?: {
    signedAt: Date | string
    hash: string // Digital signature hash
  }
  attachments?: {
    type: 'image' | 'pdf' | 'link'
    url: string
    thumbnail?: string
  }[]
  metadata?: Record<string, unknown>
}

export interface SpineTimelineProps {
  items: SpineItem[]
  onItemPress?: (item: SpineItem) => void
  showSignatures?: boolean
  groupByDate?: boolean
}

// Progress Bar Types
export interface ProgressBarProps {
  progress: number // 0-100
  phases?: {
    name: string
    completed: boolean
    current: boolean
  }[]
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

// Lot Card Types
export interface LotCardProps {
  id: string
  lotNumber: string
  address?: string
  status: 'not_started' | 'in_progress' | 'delayed' | 'completed' | 'on_hold'
  progress: number
  currentPhase?: string
  icons?: string[] // Array of icon keys
  worker?: {
    id: string
    name: string
    avatar?: string
  }
  deadline?: Date | string
  onPress?: () => void
}

// QR Code Types
export interface QRAssignment {
  houseId: string
  siteId: string
  lotNumber: string
  assignedBy: string // Foreman ID
  assignedAt: string // ISO date
  expectedStartDate: string
  expectedEndDate: string
  planUrls?: string[]
}

// User Badge Types
export interface UserBadgeProps {
  name: string
  role: 'worker' | 'foreman' | 'manager'
  avatar?: string
  timestamp?: Date | string
  showRole?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// Legend Types
export interface LegendItem {
  icon: string
  label: string
  count?: number
}

export interface MapLegendProps {
  items: LegendItem[]
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}
