'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Camera, Mail, Calendar, FileText, AlertTriangle, 
  CheckCircle, RefreshCw, MessageSquare, ExternalLink,
  Clock, User
} from 'lucide-react'
import type { TimelineEvent } from '@/types/database'

interface TimelineProps {
  events: TimelineEvent[]
  houseId?: string
  loading?: boolean
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  photo: <Camera className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  alert: <AlertTriangle className="w-4 h-4" />,
  ai_validation: <CheckCircle className="w-4 h-4" />,
  status_change: <RefreshCw className="w-4 h-4" />,
  issue: <AlertTriangle className="w-4 h-4" />,
  inspection: <CheckCircle className="w-4 h-4" />
}

const EVENT_COLORS: Record<string, string> = {
  photo: 'bg-blue-100 text-blue-600 border-blue-200',
  email: 'bg-purple-100 text-purple-600 border-purple-200',
  calendar: 'bg-green-100 text-green-600 border-green-200',
  note: 'bg-gray-100 text-gray-600 border-gray-200',
  alert: 'bg-red-100 text-red-600 border-red-200',
  ai_validation: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  status_change: 'bg-orange-100 text-orange-600 border-orange-200',
  issue: 'bg-red-100 text-red-600 border-red-200',
  inspection: 'bg-teal-100 text-teal-600 border-teal-200'
}

const LINE_COLORS: Record<string, string> = {
  photo: 'bg-blue-400',
  email: 'bg-purple-400',
  calendar: 'bg-green-400',
  note: 'bg-gray-400',
  alert: 'bg-red-400',
  ai_validation: 'bg-emerald-400',
  status_change: 'bg-orange-400',
  issue: 'bg-red-400',
  inspection: 'bg-teal-400'
}

export default function Timeline({ events, houseId, loading }: TimelineProps) {
  const [filter, setFilter] = useState<string>('all')
  
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.event_type === filter)

  const eventTypes = ['all', ...new Set(events.map(e => e.event_type))]

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No events yet</p>
        <p className="text-sm mt-1">Timeline will populate as activity happens</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {eventTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 text-sm rounded-full capitalize transition-colors ${
              filter === type 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {filteredEvents.map((event, index) => (
          <div key={event.id} className="relative flex gap-4 pb-6">
            {/* Vertical Line */}
            {index < filteredEvents.length - 1 && (
              <div 
                className={`absolute left-5 top-10 w-0.5 h-full -ml-px ${LINE_COLORS[event.event_type] || 'bg-gray-300'}`}
              />
            )}

            {/* Icon */}
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${EVENT_COLORS[event.event_type] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {EVENT_ICONS[event.event_type] || <FileText className="w-4 h-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{event.title}</h4>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  )}
                </div>
                
                {event.source_link && (
                  <a 
                    href={event.source_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(event.created_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
                
                {event.source && (
                  <span className="flex items-center gap-1 capitalize">
                    {event.source}
                  </span>
                )}

                <span className="text-gray-400">
                  {formatDistanceToNow(new Date(event.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </div>

              {/* Additional metadata preview */}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(event.metadata).slice(0, 3).map(([key, value]) => (
                      <span 
                        key={key}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                      >
                        <span className="font-medium">{key}:</span>
                        <span className="ml-1">{String(value)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
