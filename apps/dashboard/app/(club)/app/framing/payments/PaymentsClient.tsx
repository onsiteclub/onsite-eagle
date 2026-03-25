'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign, Filter, Check, CreditCard, ChevronDown, X,
  Receipt, AlertCircle, Lock, Unlock, ArrowRightLeft,
} from 'lucide-react'
import { createClient } from '@onsite/supabase/client'
import {
  approvePayment, markPaymentPaid, releaseHoldback, reassignHoldback,
  PAYMENT_STATUS_CONFIG, HOLDBACK_STATUS_CONFIG,
} from '@onsite/framing'
import type { FrmPhasePayment, PaymentStatus, HoldbackStatus, FrmJobsite, FrmCrew } from '@onsite/framing'

type PaymentWithRelations = FrmPhasePayment & {
  lot: { id: string; lot_number: string; address: string | null; jobsite_id: string }
  crew: { id: string; name: string } | null
  phase: { id: string; name: string; order_index: number } | null
}

interface PaymentSummary {
  total_count: number
  unpaid: { count: number; amount: number }
  pending: { count: number; amount: number }
  approved: { count: number; amount: number }
  paid: { count: number; amount: number }
  total_amount: number
}

interface HoldbackSummaryData {
  held: { count: number; amount: number }
  released: { count: number; amount: number }
  reassigned: { count: number; amount: number }
  total_holdback: number
}

interface PaymentsClientProps {
  initialPayments: PaymentWithRelations[]
  initialSummaries: Record<string, PaymentSummary>
  holdbackSummary: HoldbackSummaryData
  holdbackEligibleLots: string[]
  jobsites: FrmJobsite[]
  crews: Array<{ id: string; name: string }>
  userId: string
}

function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

function statusBadge(status: PaymentStatus) {
  const config = PAYMENT_STATUS_CONFIG[status]
  const colorMap: Record<PaymentStatus, string> = {
    unpaid: 'bg-gray-50 text-gray-600',
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-700',
    paid: 'bg-green-50 text-green-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorMap[status]}`}>
      {config.label}
    </span>
  )
}

function holdbackBadge(status: HoldbackStatus) {
  const config = HOLDBACK_STATUS_CONFIG[status]
  const colorMap: Record<HoldbackStatus, string> = {
    none: 'bg-gray-50 text-gray-500',
    held: 'bg-amber-50 text-amber-700',
    released: 'bg-green-50 text-green-700',
    reassigned: 'bg-violet-50 text-violet-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorMap[status]}`}>
      {config.label}
    </span>
  )
}

export default function PaymentsClient({
  initialPayments,
  initialSummaries,
  holdbackSummary,
  holdbackEligibleLots,
  jobsites,
  crews,
  userId,
}: PaymentsClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Filters
  const [selectedJobsite, setSelectedJobsite] = useState<string>('all')
  const [selectedCrew, setSelectedCrew] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedHoldback, setSelectedHoldback] = useState<string>('all')

  // Approve modal
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [deductions, setDeductions] = useState<string>('0')
  const [extras, setExtras] = useState<string>('0')
  const [notes, setNotes] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Holdback modals
  const [releasingId, setReleasingId] = useState<string | null>(null)
  const [releaseNotes, setReleaseNotes] = useState<string>('')
  const [reassigningId, setReassigningId] = useState<string | null>(null)
  const [reassignCrewId, setReassignCrewId] = useState<string>('')
  const [reassignNotes, setReassignNotes] = useState<string>('')

  const eligibleSet = new Set(holdbackEligibleLots)

  // Compute aggregate summary across all jobsites
  const aggregateSummary: PaymentSummary = Object.values(initialSummaries).reduce(
    (acc, s) => ({
      total_count: acc.total_count + s.total_count,
      unpaid: { count: acc.unpaid.count + s.unpaid.count, amount: acc.unpaid.amount + s.unpaid.amount },
      pending: { count: acc.pending.count + s.pending.count, amount: acc.pending.amount + s.pending.amount },
      approved: { count: acc.approved.count + s.approved.count, amount: acc.approved.amount + s.approved.amount },
      paid: { count: acc.paid.count + s.paid.count, amount: acc.paid.amount + s.paid.amount },
      total_amount: acc.total_amount + s.total_amount,
    }),
    {
      total_count: 0,
      unpaid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      total_amount: 0,
    },
  )

  // Filter payments
  const filteredPayments = initialPayments.filter(p => {
    if (selectedJobsite !== 'all' && p.lot.jobsite_id !== selectedJobsite) return false
    if (selectedCrew !== 'all' && p.crew_id !== selectedCrew) return false
    if (selectedStatus !== 'all' && p.status !== selectedStatus) return false
    if (selectedHoldback !== 'all' && p.holdback_status !== selectedHoldback) return false
    return true
  })

  // Group by jobsite for display
  const jobsiteMap = new Map(jobsites.map(j => [j.id, j]))

  async function handleApprove(paymentId: string) {
    setActionLoading(paymentId)
    try {
      const supabase = createClient()
      await approvePayment(supabase, paymentId, {
        approved_by: userId,
        deductions: parseFloat(deductions) || 0,
        extras: parseFloat(extras) || 0,
        notes: notes || undefined,
      })
      setApprovingId(null)
      setDeductions('0')
      setExtras('0')
      setNotes('')
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('Failed to approve payment:', err)
      alert('Failed to approve payment. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleMarkPaid(paymentId: string) {
    if (!confirm('Mark this payment as paid?')) return
    setActionLoading(paymentId)
    try {
      const supabase = createClient()
      await markPaymentPaid(supabase, paymentId)
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('Failed to mark payment as paid:', err)
      alert('Failed to mark payment as paid. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReleaseHoldback(paymentId: string) {
    setActionLoading(paymentId)
    try {
      const supabase = createClient()
      await releaseHoldback(supabase, paymentId, userId, releaseNotes || undefined)
      setReleasingId(null)
      setReleaseNotes('')
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('Failed to release holdback:', err)
      alert('Failed to release holdback. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReassignHoldback(paymentId: string) {
    if (!reassignCrewId) {
      alert('Please select a crew.')
      return
    }
    if (!reassignNotes.trim()) {
      alert('Please provide a reason for reassignment.')
      return
    }
    setActionLoading(paymentId)
    try {
      const supabase = createClient()
      await reassignHoldback(supabase, paymentId, reassignCrewId, userId, reassignNotes)
      setReassigningId(null)
      setReassignCrewId('')
      setReassignNotes('')
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('Failed to reassign holdback:', err)
      alert('Failed to reassign holdback. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  function openApproveForm(payment: PaymentWithRelations) {
    setApprovingId(payment.id)
    setDeductions(payment.deductions?.toString() ?? '0')
    setExtras(payment.extras?.toString() ?? '0')
    setNotes(payment.notes ?? '')
  }

  const hasFilters = selectedJobsite !== 'all' || selectedCrew !== 'all' || selectedStatus !== 'all' || selectedHoldback !== 'all'

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Payments</h1>
          <p className="text-[#667085] mt-1">Track and manage crew payments per phase</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200">
          <div className="shrink-0">
            <AlertCircle className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#101828] leading-tight">
              {formatCAD(aggregateSummary.unpaid.amount)}
            </p>
            <p className="text-xs text-[#667085]">
              Unpaid ({aggregateSummary.unpaid.count})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200">
          <div className="shrink-0">
            <Receipt className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#101828] leading-tight">
              {formatCAD(aggregateSummary.pending.amount)}
            </p>
            <p className="text-xs text-[#667085]">
              Pending ({aggregateSummary.pending.count})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200">
          <div className="shrink-0">
            <Check className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#101828] leading-tight">
              {formatCAD(aggregateSummary.approved.amount)}
            </p>
            <p className="text-xs text-[#667085]">
              Approved ({aggregateSummary.approved.count})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200">
          <div className="shrink-0">
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#101828] leading-tight">
              {formatCAD(aggregateSummary.paid.amount)}
            </p>
            <p className="text-xs text-[#667085]">
              Paid ({aggregateSummary.paid.count})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-amber-200 bg-amber-50/30">
          <div className="shrink-0">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#101828] leading-tight">
              {formatCAD(holdbackSummary.held.amount)}
            </p>
            <p className="text-xs text-[#667085]">
              Holdback ({holdbackSummary.held.count})
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#667085]" />
          <span className="text-sm font-medium text-[#101828]">Filters</span>
          {hasFilters && (
            <button
              onClick={() => {
                setSelectedJobsite('all')
                setSelectedCrew('all')
                setSelectedStatus('all')
                setSelectedHoldback('all')
              }}
              className="ml-auto text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Jobsite filter */}
          <div className="relative">
            <select
              value={selectedJobsite}
              onChange={e => setSelectedJobsite(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Jobsites</option>
              {jobsites.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#667085] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Crew filter */}
          <div className="relative">
            <select
              value={selectedCrew}
              onChange={e => setSelectedCrew(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Crews</option>
              {crews.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#667085] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#667085] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Holdback filter */}
          <div className="relative">
            <select
              value={selectedHoldback}
              onChange={e => setSelectedHoldback(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Holdback</option>
              <option value="held">Held</option>
              <option value="released">Released</option>
              <option value="reassigned">Reassigned</option>
              <option value="none">No Holdback</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#667085] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#101828] mb-1">No payments found</h3>
            <p className="text-[#667085] text-sm">
              {hasFilters
                ? 'Try adjusting your filters to see more results.'
                : 'Payments are created automatically when crews are assigned to phases.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Lot</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Phase</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Crew</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Sqft</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Rate</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Total</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Ded.</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Extras</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Final</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Payable</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Holdback</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[#667085] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map(payment => {
                  const jobsite = jobsiteMap.get(payment.lot.jobsite_id)
                  const isLoading = actionLoading === payment.id
                  const isEligible = eligibleSet.has(payment.lot_id)

                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[#101828]">Lot {payment.lot.lot_number}</p>
                          {jobsite && (
                            <p className="text-xs text-[#667085]">{jobsite.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#101828]">
                        {payment.phase?.name ?? payment.phase_id}
                      </td>
                      <td className="py-3 px-4 text-[#101828]">
                        {payment.crew?.name ?? 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-right text-[#101828] tabular-nums">
                        {payment.sqft.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-[#101828] tabular-nums">
                        {formatCAD(payment.rate_per_sqft)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#101828] font-medium tabular-nums">
                        {formatCAD(payment.total)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {payment.deductions > 0 ? (
                          <span className="text-red-600">-{formatCAD(payment.deductions)}</span>
                        ) : (
                          <span className="text-[#667085]">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {payment.extras > 0 ? (
                          <span className="text-green-600">+{formatCAD(payment.extras)}</span>
                        ) : (
                          <span className="text-[#667085]">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-[#101828] tabular-nums">
                        {formatCAD(payment.final_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#101828] tabular-nums">
                        {formatCAD(payment.payable_now)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {holdbackBadge(payment.holdback_status)}
                          {payment.holdback_status !== 'none' && (
                            <span className="text-[10px] text-[#667085] tabular-nums">
                              {formatCAD(payment.holdback_amount)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {statusBadge(payment.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Payment actions */}
                          {(payment.status === 'unpaid' || payment.status === 'pending') && (
                            <button
                              onClick={() => openApproveForm(payment)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}
                          {payment.status === 'approved' && (
                            <button
                              onClick={() => handleMarkPaid(payment.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              {isLoading ? '...' : 'Mark Paid'}
                            </button>
                          )}
                          {payment.status === 'paid' && payment.holdback_status === 'none' && (
                            <span className="text-xs text-[#667085]">
                              {payment.paid_at
                                ? new Date(payment.paid_at).toLocaleDateString('en-CA')
                                : 'Paid'}
                            </span>
                          )}
                          {/* Holdback actions */}
                          {payment.holdback_status === 'held' && isEligible && (
                            <>
                              <button
                                onClick={() => { setReleasingId(payment.id); setReleaseNotes('') }}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                              >
                                <Unlock className="w-3 h-3" />
                                Release
                              </button>
                              <button
                                onClick={() => { setReassigningId(payment.id); setReassignCrewId(''); setReassignNotes('') }}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 rounded-md hover:bg-violet-100 transition-colors disabled:opacity-50"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                Reassign
                              </button>
                            </>
                          )}
                          {payment.holdback_status === 'held' && !isEligible && (
                            <span className="text-[10px] text-amber-600 leading-tight">
                              Awaiting final
                            </span>
                          )}
                          {payment.holdback_status === 'released' && (
                            <span className="text-xs text-green-600">
                              {payment.holdback_released_at
                                ? new Date(payment.holdback_released_at).toLocaleDateString('en-CA')
                                : 'Released'}
                            </span>
                          )}
                          {payment.holdback_status === 'reassigned' && (
                            <span className="text-xs text-violet-600">
                              Reassigned
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary row */}
        {filteredPayments.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50/50 flex items-center justify-between">
            <p className="text-sm text-[#667085]">
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-4">
              <p className="text-sm text-amber-700">
                Held: {formatCAD(filteredPayments.filter(p => p.holdback_status === 'held').reduce((s, p) => s + p.holdback_amount, 0))}
              </p>
              <p className="text-sm font-semibold text-[#101828]">
                Payable: {formatCAD(filteredPayments.reduce((sum, p) => sum + p.payable_now, 0))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal Overlay */}
      {approvingId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-[#101828]">Approve Payment</h3>
              <button
                onClick={() => setApprovingId(null)}
                className="p-1 rounded-md hover:bg-gray-100 text-[#667085]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const payment = filteredPayments.find(p => p.id === approvingId) ?? initialPayments.find(p => p.id === approvingId)
                if (!payment) return null
                return (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-[#101828]">
                      Lot {payment.lot.lot_number} - {payment.phase?.name ?? payment.phase_id}
                    </p>
                    <p className="text-[#667085] mt-0.5">
                      {payment.crew?.name ?? 'Unknown'} &middot; {payment.sqft.toLocaleString()} sqft @ {formatCAD(payment.rate_per_sqft)}/sqft
                    </p>
                    <p className="font-semibold text-[#101828] mt-1">
                      Base total: {formatCAD(payment.total)}
                    </p>
                  </div>
                )
              })()}

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Deductions (CAD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions}
                  onChange={e => setDeductions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Extras (CAD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extras}
                  onChange={e => setExtras(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                  placeholder="Reason for deductions or extras..."
                />
              </div>

              {(() => {
                const payment = filteredPayments.find(p => p.id === approvingId) ?? initialPayments.find(p => p.id === approvingId)
                if (!payment) return null
                const computedFinal = payment.total - (parseFloat(deductions) || 0) + (parseFloat(extras) || 0)
                const holdback = computedFinal * payment.holdback_pct / 100
                const payableNow = computedFinal - holdback
                return (
                  <div className="space-y-2">
                    <div className="bg-teal-50 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-teal-800">Final Amount</span>
                      <span className="text-lg font-bold text-teal-800">{formatCAD(computedFinal)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 text-sm">
                      <span className="text-amber-700">Holdback ({payment.holdback_pct}%)</span>
                      <span className="font-medium text-amber-700">{formatCAD(holdback)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 text-sm">
                      <span className="text-green-700">Payable Now</span>
                      <span className="font-bold text-green-700">{formatCAD(payableNow)}</span>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setApprovingId(null)}
                className="px-4 py-2 text-sm font-medium text-[#667085] hover:text-[#101828] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approvingId)}
                disabled={actionLoading === approvingId}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg hover:bg-[#0D6B63] transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {actionLoading === approvingId ? 'Approving...' : 'Approve Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Holdback Modal */}
      {releasingId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-[#101828]">Release Holdback</h3>
              <button
                onClick={() => setReleasingId(null)}
                className="p-1 rounded-md hover:bg-gray-100 text-[#667085]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const payment = initialPayments.find(p => p.id === releasingId)
                if (!payment) return null
                return (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-[#101828]">
                      Lot {payment.lot.lot_number} - {payment.phase?.name ?? payment.phase_id}
                    </p>
                    <p className="text-[#667085] mt-0.5">
                      {payment.crew?.name ?? 'Unknown'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-amber-700 font-medium">Holdback to release</span>
                      <span className="text-lg font-bold text-amber-700">{formatCAD(payment.holdback_amount)}</span>
                    </div>
                  </div>
                )
              })()}

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={releaseNotes}
                  onChange={e => setReleaseNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                  placeholder="Work confirmed complete..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setReleasingId(null)}
                className="px-4 py-2 text-sm font-medium text-[#667085] hover:text-[#101828] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReleaseHoldback(releasingId)}
                disabled={actionLoading === releasingId}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                {actionLoading === releasingId ? 'Releasing...' : 'Release Holdback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Holdback Modal */}
      {reassigningId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-[#101828]">Reassign Holdback</h3>
              <button
                onClick={() => setReassigningId(null)}
                className="p-1 rounded-md hover:bg-gray-100 text-[#667085]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const payment = initialPayments.find(p => p.id === reassigningId)
                if (!payment) return null
                return (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-[#101828]">
                      Lot {payment.lot.lot_number} - {payment.phase?.name ?? payment.phase_id}
                    </p>
                    <p className="text-[#667085] mt-0.5">
                      Original crew: {payment.crew?.name ?? 'Unknown'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-violet-700 font-medium">Amount to reassign</span>
                      <span className="text-lg font-bold text-violet-700">{formatCAD(payment.holdback_amount)}</span>
                    </div>
                  </div>
                )
              })()}

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Assign to crew *
                </label>
                <div className="relative">
                  <select
                    value={reassignCrewId}
                    onChange={e => setReassignCrewId(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Select crew...</option>
                    {crews.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#667085] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-1">
                  Reason *
                </label>
                <textarea
                  value={reassignNotes}
                  onChange={e => setReassignNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                  placeholder="Original crew didn't return to finish the work..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setReassigningId(null)}
                className="px-4 py-2 text-sm font-medium text-[#667085] hover:text-[#101828] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReassignHoldback(reassigningId)}
                disabled={actionLoading === reassigningId || !reassignCrewId || !reassignNotes.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {actionLoading === reassigningId ? 'Reassigning...' : 'Reassign Holdback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
