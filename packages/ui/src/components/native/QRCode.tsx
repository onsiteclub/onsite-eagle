import React from 'react'
import QRCodeSvg from 'react-native-qrcode-svg'
import type { QRCodeProps } from '../shared/types'

/**
 * QRCode component for React Native (Expo)
 *
 * Usage:
 * import { QRCode } from '@onsite/ui/native'
 *
 * <QRCode value="https://example.com" size={200} />
 */
export function QRCode({
  value,
  size = 200,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  level = 'H',
}: QRCodeProps) {
  return (
    <QRCodeSvg
      value={value}
      size={size}
      backgroundColor={bgColor}
      color={fgColor}
      ecl={level}
    />
  )
}

export default QRCode
