'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center"><div className="text-[#888884]">Loading...</div></div>}>
      <SelfCheckCompleteContent />
    </Suspense>
  )
}

function SelfCheckCompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const reference = searchParams.get('ref')
  const [report, setReport] = useState<ReportInfo | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('selfCheckResults')
    if (!stored) {
      router.push('/self')
      return
    }
    const data = JSON.parse(stored) as StoredResults
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
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="text-[#888884]">Loading...</div>
      </div>
    )
  }

  const passCount = report.items.filter((i) => i.result === 'pass').length
  const failCount = report.items.filter((i) => i.result === 'fail').length
  const naCount = report.items.filter((i) => i.result === 'na').length
  const totalPhotos = report.items.reduce((sum, i) => sum + (i.photos?.length ?? 0), 0)
  const failedItems = report.items.filter((i) => i.result === 'fail')
  const hasNoPhotos = totalPhotos === 0

  const reportUrl = token ? `${window.location.origin}/report?token=${token}` : null

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
        { type: 'application/pdf' },
      )
      await navigator.share({
        title: `${report!.transitionLabel} — ${report!.lotNumber}`,
        text: `Gate check ${report!.passed ? 'PASSED' : 'FAILED'}: ${passCount} pass, ${failCount} fail, ${naCount} n/a, ${totalPhotos} photos`,
        files: [file],
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handleDownloadPDF()
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col items-center">
      <div className="w-full bg-[#1A1A1A] px-4 py-3 mb-6">
        <div className="max-w-[480px] mx-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-[#C58B1B] flex items-center justify-center">
            <span className="text-white font-bold text-sm">GC</span>
          </div>
          <span className="font-semibold text-white text-[15px]">Gate Check</span>
        </div>
      </div>

      <div className="w-full max-w-[480px] px-4">
        <div
          className={`
            rounded-[14px] p-6 text-center mb-6
            ${report.passed ? 'bg-[#D1FAE5] border border-[#16A34A]/30' : 'bg-[rgba(220,38,38,0.12)] border border-[#DC2626]/30'}
          `}
        >
          <div className={`text-4xl mb-2 ${report.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {report.passed ? '✓' : '✗'}
          </div>
          <h1 className={`text-2xl font-bold ${report.passed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {report.passed ? 'PASSED' : 'FAILED'}
          </h1>
          <p className="text-[15px] text-[#888884] mt-1">{report.transitionLabel}</p>
          <p className="text-xs text-[#B0AFA9] mt-1">
            {report.jobsite} — {report.lotNumber}
          </p>
        </div>

        <div className="bg-white rounded-[14px] border border-[#D1D0CE] p-5 mb-4">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-3">Summary</h2>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 bg-[#D1FAE5] rounded-[14px]">
              <div className="text-lg font-bold text-[#16A34A]">{passCount}</div>
              <div className="text-xs text-[#888884]">Pass</div>
            </div>
            <div className="text-center p-3 bg-[rgba(220,38,38,0.12)] rounded-[14px]">
              <div className="text-lg font-bold text-[#DC2626]">{failCount}</div>
              <div className="text-xs text-[#888884]">Fail</div>
            </div>
            <div className="text-center p-3 bg-[#E5E5E3] rounded-[14px]">
              <div className="text-lg font-bold text-[#888884]">{naCount}</div>
              <div className="text-xs text-[#888884]">N/A</div>
            </div>
            <div className="text-center p-3 bg-[#FFF3D6] rounded-[14px]">
              <div className="text-lg font-bold text-[#C58B1B]">{totalPhotos}</div>
              <div className="text-xs text-[#888884]">Photos</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E5E3] text-xs text-[#888884] space-y-1">
            <p>
              Inspector: <span className="text-[#1A1A1A]">{report.name}</span>
            </p>
            {report.company && (
              <p>
                Company: <span className="text-[#1A1A1A]">{report.company}</span>
              </p>
            )}
            <p>
              Date:{' '}
              <span className="text-[#1A1A1A]">
                {new Date(report.completedAt).toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {failedItems.length > 0 && (
          <div className="bg-white rounded-[14px] border border-[#D1D0CE] p-5 mb-6">
            <h2 className="text-[15px] font-semibold text-[#DC2626] mb-3">
              Failed Items ({failedItems.length})
            </h2>
            <div className="space-y-2">
              {failedItems.map((item) => (
                <div key={item.code} className="flex items-start gap-2 text-[15px]">
                  <span className="text-[#DC2626] flex-shrink-0">&times;</span>
                  <div>
                    <p className="text-[#1A1A1A]">{item.label}</p>
                    {item.isBlocking && (
                      <span className="text-[9px] font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.12)] px-1 py-0.5 rounded">
                        BLOCKING
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-xs text-[#888884] mt-0.5 italic">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {token && reportUrl && (
          <div className="bg-white rounded-[14px] border border-[#C58B1B]/30 p-5 mb-4">
            {reference && (
              <p className="text-xs font-mono text-[#888884] mb-3">Ref: {reference}</p>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(reportUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="w-full h-[52px] rounded-[14px] text-[15px] font-semibold bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors"
            >
              {copied ? '✓ Link copied!' : 'Copy Report Link'}
            </button>
            <p className="text-[11px] text-[#888884] mt-3 text-center">
              Anyone with the link can view, edit, and expand photos.
            </p>
          </div>
        )}

        {!token && hasNoPhotos && (
          <div className="bg-[#FFF3D6] border border-[#F2D28B] rounded-[14px] p-4 mb-4">
            <p className="text-[15px] font-semibold text-[#8F6513]">No photos attached</p>
            <p className="text-xs text-[#8F6513] mt-1">
              This report has no photos. Reports without photos cannot be shared. Go back and
              attach cleanup photos (inside and outside the unit) to enable sharing.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {token && reportUrl ? (
            <>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${report!.transitionLabel} — ${report!.lotNumber}`,
                      text: `Gate check ${report!.passed ? 'PASSED' : 'FAILED'}${reference ? ` (${reference})` : ''}`,
                      url: reportUrl,
                    })
                  } else {
                    navigator.clipboard.writeText(reportUrl)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                }}
                className="w-full h-[52px] rounded-[14px] font-semibold text-[15px] bg-[#C58B1B] text-white hover:bg-[#A67516] transition-colors"
              >
                Share Link
              </button>

              <button
                onClick={() => router.push(`/report?token=${token}`)}
                className="w-full h-[52px] rounded-[14px] font-semibold text-[15px] border border-[#D1D0CE] text-[#888884] bg-white hover:bg-[#F5F5F4] transition-colors"
              >
                Open Report
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="w-full h-[52px] rounded-[14px] font-semibold text-[15px] border border-[#D1D0CE] text-[#888884] bg-white hover:bg-[#F5F5F4] transition-colors"
              >
                {generating ? 'Generating...' : 'Download PDF'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className={`
                  w-full h-[52px] rounded-[14px] font-semibold text-[15px] transition-colors
                  ${generating ? 'bg-[#F5F5F4] text-[#B0AFA9]' : 'bg-[#C58B1B] text-white hover:bg-[#A67516]'}
                `}
              >
                {generating ? 'Generating...' : 'Download PDF'}
              </button>

              <button
                onClick={handleShare}
                disabled={generating || hasNoPhotos}
                className={`
                  w-full h-[52px] rounded-[14px] font-semibold text-[15px] border transition-colors
                  ${
                    hasNoPhotos
                      ? 'border-[#D1D0CE] text-[#B0AFA9] cursor-not-allowed bg-white'
                      : 'border-[#D1D0CE] text-[#888884] bg-white hover:bg-[#F5F5F4]'
                  }
                `}
              >
                {hasNoPhotos ? 'Share unavailable (no photos)' : 'Share Report'}
              </button>
            </>
          )}

          <button
            onClick={() => {
              sessionStorage.removeItem('selfCheck')
              sessionStorage.removeItem('selfCheckResults')
              router.push('/self')
            }}
            className="w-full h-[52px] rounded-[14px] font-semibold text-[15px] text-[#888884] hover:text-[#1A1A1A] transition-colors"
          >
            New Checklist
          </button>
        </div>

        <p className="text-center text-xs text-[#B0AFA9] mt-6">
          OnSite Club — Built for the trades
        </p>
      </div>
    </div>
  )
}
