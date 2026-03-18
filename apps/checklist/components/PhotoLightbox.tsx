'use client'

import { useState, useEffect, useCallback } from 'react'

interface PhotoLightboxProps {
  photos: string[]
  initialIndex?: number
  onClose: () => void
}

export default function PhotoLightbox({ photos, initialIndex = 0, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex)

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goNext, goPrev])

  // Touch swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null)

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(26,26,26,0.9)] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl hover:bg-white/20 z-10"
      >
        &times;
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm z-10">
        {index + 1} / {photos.length}
      </div>

      {/* Nav arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl hover:bg-white/20 z-10"
          >
            &#8249;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl hover:bg-white/20 z-10"
          >
            &#8250;
          </button>
        </>
      )}

      {/* Image */}
      <img
        src={photos[index]}
        alt={`Photo ${index + 1}`}
        className="max-w-[92vw] max-h-[85vh] object-contain select-none"
        style={{ touchAction: 'pinch-zoom' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart === null) return
          const diff = e.changedTouches[0].clientX - touchStart
          if (Math.abs(diff) > 50) {
            diff > 0 ? goPrev() : goNext()
          }
          setTouchStart(null)
        }}
        draggable={false}
      />
    </div>
  )
}
