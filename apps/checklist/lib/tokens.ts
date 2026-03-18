import { randomBytes } from 'crypto'

/** 12-char URL-safe token (~72 bits entropy) */
export function generateToken(): string {
  return randomBytes(9).toString('base64url')
}

/** Human-readable reference: CHK-YYYYMMDD-XXXX */
export function generateReference(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const suffix = randomBytes(2).toString('hex').toUpperCase().slice(0, 4)
  return `CHK-${date}-${suffix}`
}
