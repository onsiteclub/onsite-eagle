'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateChecklistPDF, type ReportInfo } from '@/lib/pdf-report'

interface StoredResults {
  info: { name: string; company: string; jobsite: string; lotNumber: string }
  transition: string
  transitionLabel: string
  items: ReportInfo['items']
  completedAt: string
  passed: boolean
}

export default function SelfCheckCompletePage() {
  const router = useRouter()
  const [report, setReport] = useState<ReportInfo | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('selfCheckResults')
    if (!stored) {
      router.push('/self')
      return
    }
    const data = JSON.parse(stored) as StoredResults
    // Flatten info into ReportInfo shape
    setReport({
      name: data.info.name,
      company: data.info.company,
      jobsite: data.info.jobsite,
      lotNumber: data.info.lotNumber,
      transition: data.transition,
      transitionLabel: data.transitionLabel,
      startedAt: data.completedAt,
      completedAt: data.completedAt,
      passed: data.passed,
      items: data.items,
    })
  }, [router])

  if (!report) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <div className="text-[#667085]">Loading...</div>
      </div>
    )
  }

  const passCount = report.items.filter((i) => i.result === 'pass').length
  const failCount = report.items.filter((i) => i.result === 'fail').length
  const naCount = report.items.filter((i) => i.result === 'na').length
  const failedItems = report.items.filter((i) => i.result === 'fail')

  async function handleDownloadPDF() {
    setGenerating(true)
    try {
      const blob = await generateChecklistPDF(report!)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `checklist-${report!.lotNumber.replace(/\s+/g, '_')}-${report!.transition}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      handleDownloadPDF()
      return
    }

    setGenerating(true)
    try {
      const blob = await generateChecklistPDF(report!)
      const file = new File(
        [blob],
        `checklist-${report!.lotNumber.replace(/\s+/g, '_')}-${report!.transition}.pdf`,
        { type: 'application/pdf' }
      )
      await navigator.share({
        title: `${report!.transitionLabel} — ${report!.lotNumber}`,
        text: `Gate check ${report!.passed ? 'PASSED' : 'FAILED'}: ${passCount} pass, ${failCount} fail, ${naCount} n/a`,
        files: [file],
      })
    } catch (err) {
      // User cancelled share or not supported
      if ((err as Error).name !== 'AbortError') {
        handleDownloadPDF()
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-[480px]">
        {/* Result Banner */}
        <div className={`
          rounded-[14px] p-6 text-center mb-6
          ${report.passed ? 'bg-[#ECFDF5] border border-[#059669]/30' : 'bg-[#FEF2F2] border border-[#DC2626]/30'}
        `}>
          <div className={`text-4xl mb-2 ${report.passed ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            {report.passed ? '\u2713' : '\u2717'}
          </div>
          <h1 className={`text-2xl font-bold ${report.passed ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
            {report.passed ? 'PASSED' : 'FAILED'}
          </h1>
          <p className="text-sm text-[#667085] mt-1">{report.transitionLabel}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {report.jobsite} — {report.lotNumber}
          </p>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-5 mb-4">
          <h2 className="text-sm font-semibold text-[#101828] mb-3">Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-[#ECFDF5] rounded-[10px]">
              <div className="text-lg font-bold text-[#059669]">{passCount}</div>
              <div className="text-xs text-[#667085]">Pass</div>
            </div>
            <div className="text-center p-3 bg-[#FEF2F2] rounded-[10px]">
              <div className="text-lg font-bold text-[#DC2626]">{failCount}</div>
              <div className="text-xs text-[#667085]">Fail</div>
            </div>
            <div className="text-center p-3 bg-[#F3F4F6] rounded-[10px]">
              <div className="text-lg font-bold text-[#6B7280]">{naCount}</div>
              <div className="text-xs text-[#667085]">N/A</div>
            </div>
          </div>

          {/* Inspector info */}
          <div className="mt-4 pt-3 border-t border-[#F3F4F6] text-xs text-[#667085] space-y-1">
            <p>Inspector: <span className="text-[#101828]">{report.name}</span></p>
            {report.company && <p>Company: <span className="text-[#101828]">{report.company}</span></p>}
            <p>Date: <span className="text-[#101828]">{new Date(report.completedAt).toLocaleString()}</span></p>
          </div>
        </div>

        {/* Failed Items */}
        {failedItems.length > 0 && (
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-5 mb-6">
            <h2 className="text-sm font-semibold text-[#DC2626] mb-3">
              Failed Items ({failedItems.length})
            </h2>
            <div className="space-y-2">
              {failedItems.map((item) => (
                <div key={item.code} className="flex items-start gap-2 text-sm">
                  <span className="text-[#DC2626] flex-shrink-0">&times;</span>
                  <div>
                    <p className="text-[#101828]">{item.label}</p>
                    {item.isBlocking && (
                      <span className="text-[9px] font-semibold text-[#DC2626] bg-red-50 px-1 py-0.5 rounded">
                        BLOCKING
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-xs text-[#667085] mt-0.5 italic">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleDownloadPDF}
            disabled={generating}
            className={`
              w-full h-12 rounded-[10px] font-semibold text-base transition-colors
              ${generating ? 'bg-gray-200 text-gray-400' : 'bg-[#0F766E] text-white hover:bg-[#0d6b63]'}
            `}
          >
            {generating ? 'Generating...' : 'Download PDF'}
          </button>

          <button
            onClick={handleShare}
            disabled={generating}
            className="w-full h-12 rounded-[10px] font-semibold text-base border border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/5 transition-colors"
          >
            Share Report
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem('selfCheck')
              sessionStorage.removeItem('selfCheckResults')
              router.push('/self')
            }}
            className="w-full h-12 rounded-[10px] font-semibold text-base text-[#667085] hover:text-[#101828] transition-colors"
          >
            New Checklist
          </button>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          OnSite Club — Built for the trades
        </p>
      </div>
    </div>
  )
}
