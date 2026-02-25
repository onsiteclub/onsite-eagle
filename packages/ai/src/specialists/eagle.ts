/**
 * Eagle AI specialist prompts.
 *
 * Photo validation, copilot analysis, and report generation
 * for wood frame residential construction inspection.
 */

/** Version of the prompts — increment when changing behavior */
export const EAGLE_PROMPT_VERSION = 1;

/** Checklist items per construction phase */
export const PHASE_CHECKLISTS: Record<string, string[]> = {
  'First Floor': [
    'floor joists installed and properly spaced',
    'subfloor sheathing installed',
    'blocking between joists',
    'rim board/band joist',
    'beam pockets visible',
    'proper joist hangers',
    'no visible damage or defects',
  ],
  'First Floor Walls': [
    'wall studs at proper spacing (16" or 24" OC)',
    'headers over window openings',
    'headers over door openings',
    'corner framing (3-stud or California corner)',
    'double top plate',
    'bottom plate secured',
    'window rough openings',
    'door rough openings',
    'cripple studs',
    'king studs and jack studs',
  ],
  'Second Floor': [
    'floor joists installed',
    'subfloor sheathing',
    'stairwell opening framed',
    'blocking between joists',
    'proper bearing on walls below',
  ],
  'Second Floor Walls': [
    'wall studs properly spaced',
    'headers over openings',
    'corner framing',
    'top plate',
    'connection to ceiling joists',
    'gable end framing if visible',
  ],
  'Roof': [
    'roof trusses or rafters installed',
    'ridge board or ridge beam',
    'roof sheathing',
    'fascia board',
    'soffit framing',
    'gable end framing',
    'truss bracing',
    'proper truss spacing',
  ],
  'Stairs Landing': [
    'stair stringers',
    'landing framing',
    'header at top of stairs',
    'proper rise and run visible',
    'handrail blocking',
    'guard rail framing',
  ],
  'Backing Frame': [
    'bathroom blocking for fixtures',
    'kitchen cabinet blocking',
    'handrail blocking',
    'TV mount blocking',
    'grab bar blocking',
    'medicine cabinet blocking',
    'towel bar blocking',
  ],
};

/**
 * Build the photo validation prompt for a specific phase.
 *
 * Used by: /api/validate-photo (Monitor)
 */
export function buildPhotoValidationPrompt(phase: string): string {
  const checklist = PHASE_CHECKLISTS[phase] ?? [];

  return `You are a construction inspector AI for wood frame residential construction.

Analyze this photo for the "${phase}" phase of construction.

Check for these items:
${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Respond in JSON format:
{
  "approved": boolean,
  "confidence": 0-1,
  "phase_match": boolean (does this photo match the expected phase?),
  "detected_items": [
    {
      "name": "item name",
      "present": boolean,
      "confidence": 0-1,
      "notes": "any observations"
    }
  ],
  "missing_critical_items": ["list of critical items not visible"],
  "quality_issues": ["photo too dark", "wrong angle", etc.],
  "safety_concerns": ["any visible safety issues"],
  "recommendation": "approve" | "request_new_photo" | "needs_supervisor_review",
  "feedback_for_worker": "Clear instruction if new photo needed",
  "overall_notes": "General observations about the construction quality"
}

Be thorough but practical. A photo doesn't need to show everything - just what's reasonably visible from that angle. Mark items as "not_applicable" if they wouldn't be visible in this type of photo.

Critical items that MUST be visible for approval: structural elements like joists, studs, headers.
Non-critical items: can be missing if other photos might capture them.`;
}

/**
 * Build the context-aware photo analysis prompt (copilot).
 *
 * Used by: /api/ai-copilot type='photo' (Monitor)
 */
export function buildPhotoAnalysisPrompt(context: {
  siteName?: string;
  lotNumber?: string;
  phaseName: string;
  phaseIndex: number;
  totalPhases: number;
  progressPercentage: number;
}): string {
  const checklist = PHASE_CHECKLISTS[context.phaseName] ?? [];

  return `You are a construction site AI assistant analyzing a photo.

Context:
- Site: ${context.siteName ?? 'Unknown'}
- Lot: ${context.lotNumber ?? 'Unknown'}
- Current Phase: ${context.phaseName} (Phase ${context.phaseIndex}/${context.totalPhases})
- Current Progress: ${context.progressPercentage}%

Phase Checklist Items:
${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Analyze this construction photo and return JSON:
{
  "detected_phase": "string (which construction phase this photo shows)",
  "checklist_items": [
    { "name": "item name", "present": boolean, "confidence": 0-1, "notes": "observation" }
  ],
  "issues": [
    { "title": "issue title", "severity": "low|medium|high|critical", "description": "details" }
  ],
  "progress_estimate": number (0-100, estimated progress for this lot based on visible work),
  "timeline_title": "string (short title for timeline entry)",
  "timeline_description": "string (detailed description of what's visible)",
  "quality_score": number (1-10, construction quality visible),
  "safety_concerns": ["any safety issues visible"]
}

Be practical - not everything needs to be visible in one photo. Focus on what IS visible.`;
}

/**
 * Prompt for extracting data from construction documents (permits, invoices, etc.).
 *
 * Used by: /api/ai-copilot type='document' (Monitor)
 */
export const DOCUMENT_EXTRACTION_PROMPT = `You are a construction document analyzer.

Analyze this document and extract:
1. Document type (inspection report, permit, invoice, contract, etc.)
2. Key data points (dates, amounts, addresses, names, lot numbers)
3. Status information (approved/denied/pending, pass/fail)
4. Any action items or requirements

Return JSON:
{
  "document_type": "string",
  "extracted_data": {
    "dates": [...],
    "amounts": [...],
    "addresses": [...],
    "names": [...],
    "lot_references": [...]
  },
  "status": "string or null",
  "action_items": ["string"],
  "timeline_title": "string (for timeline entry)",
  "timeline_description": "string (summary)",
  "lot_updates": {
    "status": "string or null",
    "current_phase": "number or null",
    "notes": "string or null"
  }
}`;

/**
 * Prompt for weekly intelligence report generation.
 *
 * Used by: report generation pipeline (planned)
 */
export const WEEKLY_REPORT_PROMPT = `You are the Eagle Intelligence Engine generating a weekly construction site report.

Given the site data, produce a structured report with:

1. PROGRESS SUMMARY: Houses on track, at risk, delayed (counts + percentages)
2. KEY ALERTS: Top 3-5 items requiring attention
3. EXTERNAL FACTORS: Weather days, permit delays, inspection results
4. WORKER INSIGHTS: Performance highlights (positive first, concerns second)
5. NEXT WEEK PREDICTION: Expected completions, potential risks

Return JSON:
{
  "executive_summary": "2-3 sentence overview",
  "sections": [
    { "title": "string", "content": "string", "type": "progress|alert|external|worker|prediction", "data": {} }
  ],
  "metrics": {
    "houses_on_track": number,
    "houses_at_risk": number,
    "houses_delayed": number,
    "weather_days_lost": number,
    "avg_progress_pct": number
  },
  "alerts": [
    { "severity": "low|medium|high|critical", "message": "string", "house_id": "string|null" }
  ]
}

Tone: Professional but accessible. Data-driven. Highlight wins before problems.`;
