'use client'

/**
 * WeeklyReport — AI-generated weekly site progress report.
 *
 * Calls /api/reports/weekly to generate, displays structured sections.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, FileText, AlertTriangle, CheckCircle,
  TrendingUp, CloudSnow, Users, Sparkles, RefreshCw,
} from 'lucide-react'

interface WeeklyReportProps {
  siteId: string
  siteName: string
}

interface ReportSection {
  title: string
  content: string
  type: 'progress' | 'alert' | 'external' | 'worker' | 'prediction'
  data?: Record<string, unknown>
}

interface ReportMetrics {
  houses_on_track: number
  houses_at_risk: number
  houses_delayed: number
  weather_days_lost: number
  avg_progress_pct: number
}

interface ReportAlert {
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  lot_id: string | null
}

interface Report {
  executive_summary: string
  sections: ReportSection[]
  metrics: ReportMetrics
  alerts: ReportAlert[]
  generated_at?: string
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  progress: TrendingUp,
  alert: AlertTriangle,
  external: CloudSnow,
  worker: Users,
  prediction: Sparkles,
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#34C759',
  medium: '#FF9500',
  high: '#FF3B30',
  critical: '#AF52DE',
}

export default function WeeklyReport({ siteId, siteName }: WeeklyReportProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reports/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobsite_id: siteId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate report')
      }

      const data = await response.json()
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  // Load previous report on mount
  useEffect(() => {
    // Could load from int_ai_reports here for cached reports
  }, [siteId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F]">Weekly Intelligence Report</h2>
          <p className="text-sm text-[#8E8E93]">
            AI-generated progress analysis for {siteName}
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-xl hover:bg-[#0056B3] transition disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? 'Generating...' : report ? 'Regenerate' : 'Generate Report'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && !report && (
        <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#007AFF] mx-auto mb-4" />
          <p className="text-[#8E8E93]">Analyzing site data and generating report...</p>
          <p className="text-xs text-[#C7C7CC] mt-1">This may take 10-20 seconds</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !report && !error && (
        <div className="bg-white rounded-xl border border-[#D2D2D7] p-12 text-center">
          <FileText className="w-12 h-12 text-[#D2D2D7] mx-auto mb-4" />
          <p className="text-lg font-semibold text-[#1D1D1F]">No report generated yet</p>
          <p className="text-sm text-[#8E8E93] mt-1">
            Click &quot;Generate Report&quot; to create an AI-powered weekly summary.
          </p>
        </div>
      )}

      {/* Report Content */}
      {report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 rounded-xl p-6 border border-[#007AFF]/20">
            <h3 className="text-sm font-semibold text-[#007AFF] uppercase tracking-wider mb-2">
              Executive Summary
            </h3>
            <p className="text-[#1D1D1F] leading-relaxed">{report.executive_summary}</p>
            {report.generated_at && (
              <p className="text-xs text-[#8E8E93] mt-3">
                Generated {new Date(report.generated_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Metrics */}
          {report.metrics && (
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'On Track', value: report.metrics.houses_on_track, color: '#34C759' },
                { label: 'At Risk', value: report.metrics.houses_at_risk, color: '#FF9500' },
                { label: 'Delayed', value: report.metrics.houses_delayed, color: '#FF3B30' },
                { label: 'Weather Days', value: report.metrics.weather_days_lost, color: '#8E8E93' },
                { label: 'Avg Progress', value: `${report.metrics.avg_progress_pct}%`, color: '#007AFF' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-[#D2D2D7] p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-xs text-[#8E8E93] mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Sections */}
          {report.sections?.map((section, i) => {
            const Icon = SECTION_ICONS[section.type] || FileText
            return (
              <div key={i} className="bg-white rounded-xl border border-[#D2D2D7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-[#007AFF]" />
                  <h3 className="font-semibold text-[#1D1D1F]">{section.title}</h3>
                </div>
                <p className="text-sm text-[#3C3C43] leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            )
          })}

          {/* Alerts */}
          {report.alerts?.length > 0 && (
            <div className="bg-white rounded-xl border border-[#D2D2D7] p-5">
              <h3 className="font-semibold text-[#1D1D1F] mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#FF9500]" />
                Active Alerts
              </h3>
              <div className="space-y-2">
                {report.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: `${SEVERITY_COLORS[alert.severity]}10` }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
                    />
                    <div>
                      <p className="text-sm text-[#1D1D1F]">{alert.message}</p>
                      {alert.lot_id && (
                        <span className="text-xs text-[#8E8E93]">House: {alert.lot_id}</span>
                      )}
                    </div>
                    <span
                      className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        color: SEVERITY_COLORS[alert.severity],
                        backgroundColor: `${SEVERITY_COLORS[alert.severity]}20`,
                      }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
