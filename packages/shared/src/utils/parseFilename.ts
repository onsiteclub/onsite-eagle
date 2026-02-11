import type { ParsedFilename } from '../types/database'

/**
 * Parse a filename to extract lot numbers and document type
 * Used for bulk document upload with auto-linking
 */
export function parseFilename(filename: string): ParsedFilename {
  const result: ParsedFilename = {
    lotNumbers: [],
    documentType: null,
    confidence: 0
  }

  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  // Patterns for lot numbers (ordered by specificity)
  const lotPatterns = [
    /LOT[_\-\s]?(\d+)/gi,           // LOT_23, LOT-23, LOT 23
    /LOTE[_\-\s]?(\d+)/gi,          // LOTE_23 (Portuguese)
    /L[_\-](\d+)/gi,                // L_23, L-23 (with separator)
    /(?:^|[_\-\s])(\d{1,4})(?:[_\-\s]|$)/g,   // Numbers with separators: _23_, -23-
  ]

  for (const pattern of lotPatterns) {
    const matches = [...nameWithoutExt.matchAll(pattern)]
    for (const match of matches) {
      const lotNum = match[1]
      if (lotNum && !result.lotNumbers.includes(lotNum)) {
        // Validate it's a reasonable lot number (1-9999)
        const num = parseInt(lotNum, 10)
        if (num >= 1 && num <= 9999) {
          result.lotNumbers.push(lotNum)
        }
      }
    }
    // If we found lots with a specific pattern, don't try generic ones
    if (result.lotNumbers.length > 0) break
  }

  // Document type detection patterns
  const typePatterns: Record<string, RegExp[]> = {
    floor_plan: [/floor/i, /planta/i, /layout/i],
    elevation: [/elevation/i, /eleva/i, /fachada/i, /front/i, /side/i, /rear/i],
    electrical: [/electr/i, /eletri/i, /wiring/i, /panel/i],
    plumbing: [/plumb/i, /hidraulic/i, /water/i, /pipe/i, /drain/i],
    framing: [/frame/i, /framing/i, /estrutura/i, /stud/i],
    foundation: [/foundation/i, /fundacao/i, /base/i, /footing/i],
    roof: [/roof/i, /telhado/i, /truss/i, /shingle/i],
    hvac: [/hvac/i, /heating/i, /cooling/i, /duct/i, /furnace/i],
    permit: [/permit/i, /license/i, /alvara/i],
    inspection: [/inspect/i, /vistoria/i, /check/i],
    contract: [/contract/i, /contrato/i, /agreement/i],
  }

  for (const [type, patterns] of Object.entries(typePatterns)) {
    if (patterns.some(p => p.test(nameWithoutExt))) {
      result.documentType = type
      break
    }
  }

  // Calculate confidence
  if (result.lotNumbers.length > 0) {
    // Found lot number - base confidence
    result.confidence = 0.75

    // Boost if we also detected document type
    if (result.documentType) {
      result.confidence = 0.90
    }

    // Boost if lot pattern was very specific (LOT_ prefix)
    if (/LOT[_\-]/i.test(nameWithoutExt)) {
      result.confidence = Math.min(result.confidence + 0.08, 0.98)
    }
  } else {
    // No lot number found - low confidence
    result.confidence = result.documentType ? 0.30 : 0.10
  }

  return result
}

/**
 * Parse multiple files and return results
 */
export function parseMultipleFiles(files: File[]): Map<string, ParsedFilename> {
  const results = new Map<string, ParsedFilename>()

  for (const file of files) {
    results.set(file.name, parseFilename(file.name))
  }

  return results
}

/**
 * Get confidence label for UI display
 */
export function getConfidenceLabel(confidence: number): {
  label: string
  color: 'green' | 'yellow' | 'red'
} {
  if (confidence >= 0.75) {
    return { label: 'High', color: 'green' }
  } else if (confidence >= 0.40) {
    return { label: 'Medium', color: 'yellow' }
  } else {
    return { label: 'Low', color: 'red' }
  }
}

/**
 * Format document type for display
 */
export function formatDocumentType(type: string | null): string {
  if (!type) return 'Unknown'
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
