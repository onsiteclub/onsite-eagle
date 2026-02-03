'use client'

import { QRCodeSVG } from 'qrcode.react'
import type { QRCodeProps } from '../shared/types'

/**
 * QRCode component for web (React/Next.js)
 *
 * Usage:
 * import { QRCode } from '@onsite/ui/web'
 *
 * <QRCode value="https://example.com" size={200} />
 */
export function QRCode({
  value,
  size = 200,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  level = 'H',
  includeMargin = false,
}: QRCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      bgColor={bgColor}
      fgColor={fgColor}
      level={level}
      includeMargin={includeMargin}
    />
  )
}

export default QRCode
