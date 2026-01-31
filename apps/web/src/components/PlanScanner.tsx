'use client'

import { useState, useCallback } from 'react'
import { Upload, FileImage, Loader2, CheckCircle, AlertCircle, Map } from 'lucide-react'

interface LotData {
  lot_number: string | null
  position: {
    x_percent: number
    y_percent: number
    width_percent: number
    height_percent: number
  }
  confidence: number
}

interface AnalysisResult {
  lots: LotData[]
  streets: { name: string | null; orientation: string }[]
  total_lots_detected: number
  plan_type: string
  notes: string
}

interface PlanScannerProps {
  onAnalysisComplete?: (analysis: AnalysisResult, svg: string) => void
}

export default function PlanScanner({ onAnalysisComplete }: PlanScannerProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setAnalysis(null)
      setSvg(null)
      setError(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      setPreview(URL.createObjectURL(droppedFile))
      setAnalysis(null)
      setSvg(null)
      setError(null)
    }
  }, [])

  const analyzePlan = async () => {
    if (!file) return

    setAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/analyze-plan', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setAnalysis(data.analysis)
      
      // Auto-generate SVG after analysis
      await generateSvg(data.analysis)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const generateSvg = async (analysisData: AnalysisResult) => {
    setGenerating(true)

    try {
      const response = await fetch('/api/generate-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: analysisData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'SVG generation failed')
      }

      setSvg(data.svg)
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisData, data.svg)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'SVG generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-500 transition-colors cursor-pointer"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="plan-upload"
        />
        <label htmlFor="plan-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700">
            Drop subdivision plan here or click to upload
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports PNG, JPG, PDF images
          </p>
        </label>
      </div>

      {/* Preview and Analysis */}
      {preview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              Original Plan
            </h3>
            <img
              src={preview}
              alt="Subdivision plan"
              className="w-full rounded-lg border"
            />
            
            {!analysis && (
              <button
                onClick={analyzePlan}
                disabled={analyzing}
                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Map className="w-5 h-5" />
                    Analyze Plan
                  </>
                )}
              </button>
            )}
          </div>

          {/* Generated SVG */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Map className="w-5 h-5" />
              Interactive Map
            </h3>
            
            {generating ? (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : svg ? (
              <div 
                className="border rounded-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg text-gray-500">
                SVG will appear here after analysis
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Analysis Results
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-500">
                {analysis.total_lots_detected}
              </div>
              <div className="text-sm text-gray-600">Lots Detected</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-500">
                {analysis.streets?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Streets</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-lg font-semibold text-gray-700 capitalize">
                {analysis.plan_type}
              </div>
              <div className="text-sm text-gray-600">Plan Type</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-lg font-semibold text-green-600">
                Ready
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>

          {/* Lots List */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Lot #</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Position</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {analysis.lots?.slice(0, 10).map((lot, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {lot.lot_number || `Lot ${i + 1}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      ({lot.position.x_percent.toFixed(0)}%, {lot.position.y_percent.toFixed(0)}%)
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${lot.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {(lot.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {analysis.lots?.length > 10 && (
              <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
                And {analysis.lots.length - 10} more lots...
              </div>
            )}
          </div>

          {/* Notes */}
          {analysis.notes && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>AI Notes:</strong> {analysis.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
