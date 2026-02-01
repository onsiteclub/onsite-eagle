'use client'

import { useState, useCallback } from 'react'
import { Upload, Camera, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

interface DetectedItem {
  name: string
  present: boolean
  confidence: number
  notes: string | null
}

interface ValidationResult {
  approved: boolean
  confidence: number
  phase_match: boolean
  detected_items: DetectedItem[]
  missing_critical_items: string[]
  quality_issues: string[]
  safety_concerns: string[]
  recommendation: 'approve' | 'request_new_photo' | 'needs_supervisor_review'
  feedback_for_worker: string
  overall_notes: string
}

const PHASES = [
  'First Floor',
  'First Floor Walls',
  'Second Floor',
  'Second Floor Walls',
  'Roof',
  'Stairs Landing',
  'Backing Frame'
]

interface PhotoValidatorProps {
  defaultPhase?: string
  onValidationComplete?: (result: ValidationResult) => void
}

export default function PhotoValidator({ defaultPhase, onValidationComplete }: PhotoValidatorProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [phase, setPhase] = useState(defaultPhase || PHASES[0])
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setResult(null)
      setError(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      setPreview(URL.createObjectURL(droppedFile))
      setResult(null)
      setError(null)
    }
  }, [])

  const validatePhoto = async () => {
    if (!file) return

    setValidating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('phase', phase)

      const response = await fetch('/api/validate-photo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      setResult(data.validation)
      
      if (onValidationComplete) {
        onValidationComplete(data.validation)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setValidating(false)
    }
  }

  const resetValidation = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const getStatusColor = (recommendation: string) => {
    switch (recommendation) {
      case 'approve': return 'bg-green-100 border-green-500 text-green-700'
      case 'request_new_photo': return 'bg-yellow-100 border-yellow-500 text-yellow-700'
      case 'needs_supervisor_review': return 'bg-orange-100 border-orange-500 text-orange-700'
      default: return 'bg-gray-100 border-gray-500 text-gray-700'
    }
  }

  const getStatusIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'approve': return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'request_new_photo': return <RefreshCw className="w-6 h-6 text-yellow-500" />
      case 'needs_supervisor_review': return <AlertTriangle className="w-6 h-6 text-orange-500" />
      default: return <XCircle className="w-6 h-6 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Phase Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Construction Phase
        </label>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          {PHASES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-500 transition-colors cursor-pointer bg-white"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="photo-upload"
        />
        <label htmlFor="photo-upload" className="cursor-pointer">
          <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700">
            Drop construction photo here or click to upload
          </p>
          <p className="text-sm text-gray-500 mt-2">
            AI will validate against {phase} checklist
          </p>
        </label>
      </div>

      {/* Preview and Validation */}
      {preview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Photo Preview */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Photo - {phase}
            </h3>
            <img
              src={preview}
              alt="Construction photo"
              className="w-full rounded-lg border"
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={validatePhoto}
                disabled={validating}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Validate Photo
                  </>
                )}
              </button>
              <button
                onClick={resetValidation}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Validation Results */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              AI Validation Result
            </h3>
            
            {validating ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
                <p className="text-gray-600">Analyzing construction elements...</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border-2 flex items-center gap-3 ${getStatusColor(result.recommendation)}`}>
                  {getStatusIcon(result.recommendation)}
                  <div>
                    <div className="font-semibold capitalize">
                      {result.recommendation.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm opacity-80">
                      Confidence: {(result.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Feedback for Worker */}
                {result.feedback_for_worker && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Feedback:</strong> {result.feedback_for_worker}
                    </p>
                  </div>
                )}

                {/* Detected Items */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 font-semibold text-sm text-gray-700">
                    Detected Items
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y">
                    {result.detected_items?.map((item, i) => (
                      <div key={i} className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <div className="flex items-center gap-2">
                          {item.present ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs text-gray-500">
                            {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Critical Items */}
                {result.missing_critical_items?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="font-semibold text-red-700 text-sm mb-2">
                      Missing Critical Items
                    </div>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {result.missing_critical_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quality Issues */}
                {result.quality_issues?.length > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="font-semibold text-yellow-700 text-sm mb-2">
                      Photo Quality Issues
                    </div>
                    <ul className="text-sm text-yellow-600 list-disc list-inside">
                      {result.quality_issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Safety Concerns */}
                {result.safety_concerns?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="font-semibold text-red-700 text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Safety Concerns
                    </div>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {result.safety_concerns.map((concern, i) => (
                        <li key={i}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Overall Notes */}
                {result.overall_notes && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Notes:</strong> {result.overall_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg text-gray-500">
                Upload a photo and click validate to see AI analysis
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
