'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X } from 'lucide-react'

interface EditableCellProps {
  value: Date
  type: 'time' | 'datetime'
  isEditing: boolean
  isEdited?: boolean
  onSave: (value: string) => void
  onCancel: () => void
}

export function EditableCell({ 
  value, 
  type, 
  isEditing, 
  isEdited,
  onSave, 
  onCancel 
}: EditableCellProps) {
  const [tempValue, setTempValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      // Format for input type="time" (HH:mm)
      const hours = value.getHours().toString().padStart(2, '0')
      const minutes = value.getMinutes().toString().padStart(2, '0')
      setTempValue(`${hours}:${minutes}`)
      
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isEditing, value])

  const handleSave = () => {
    if (!tempValue) return
    
    // Construct full ISO string with original date + new time
    const [hours, minutes] = tempValue.split(':').map(Number)
    const newDate = new Date(value)
    newDate.setHours(hours, minutes, 0, 0)
    
    onSave(newDate.toISOString())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onCancel()
  }

  const displayTime = value.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="time"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-24 px-2 py-1 text-sm border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:bg-green-50 rounded"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:bg-gray-50 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <span className={`text-gray-600 ${isEdited ? 'text-amber-700 font-medium' : ''}`}>
      {displayTime}
      {isEdited && (
        <span className="ml-1 text-amber-500 text-xs" title="Manually edited">
          •
        </span>
      )}
    </span>
  )
}
