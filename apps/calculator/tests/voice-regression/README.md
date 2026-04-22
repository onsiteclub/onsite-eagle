# Voice Regression Suite (Phase 2.1)

End-to-end regression tests for the voice pipeline — records real audio
clips, hits the deployed `/api/interpret`, and compares GPT's output
against expected expressions. This is the **authoritative safety net**
for voice quality: any prompt/model change must keep the pass-rate
above baseline before merging.

## Status

**Scaffolded, not populated.** The runner exists but needs real audio
samples. See [How to contribute samples](#how-to-contribute-samples).

## Structure

```
tests/voice-regression/
├── README.md                    ← this file
├── run.ts                       ← runner script (npx tsx)
├── samples/
│   ├── pt-puro/
│   │   ├── 01_cinco_e_meio_mais_tres.webm
│   │   ├── 01_cinco_e_meio_mais_tres.json
│   │   └── ...
│   ├── en-puro/
│   ├── portunhol/
│   ├── espanhol/
│   ├── frances-qc/
│   └── ruido/
└── report/
    └── latest.json              ← last run's results (gitignored)
```

Each sample is a pair: `foo.webm` audio + `foo.json` expected output.

## Expected JSON schema

```jsonc
{
  "expression": "5 1/2 + 3",        // REQUIRED — canonical engine input
  "intent": "calculation",          // optional hint: calculation/area/volume/conversion/stairs/triangle/unclear
  "expected_dimension": "length",   // optional: scalar/length/area/volume
  "language": "pt",                 // source language of the audio
  "difficulty": "easy",             // easy/medium/hard — for weighted scoring
  "notes": "Mixed number + whole addition — carpenter norm."
}
```

## Target sample mix (30 total, from the plan)

| Count | Category | Description |
|-------|----------|-------------|
| 5 | PT puro | Native Portuguese speaker, no mixing |
| 5 | EN puro | Native English |
| 5 | Portunhol | PT/EN mix common in Brazilian carpenters in Canada |
| 5 | Espanhol | Latin American Spanish |
| 4 | Frações | "five and a half", "um quarto", "three eighths" |
| 3 | Compostas | Multi-operation: `5 + 3 * 2`, `(2' + 3') / 2` |
| 2 | Dimensões | "two by four", "dois por quatro" |
| 1 | Ruído | Background noise (saw, hammer) + speech |
| 1 | Français QC | Quebec French (target market) |

## How to contribute samples

1. Record a clip (WebM Opus, 16kHz mono, ≤ 10 s) of someone saying a construction calculation.
   - iOS: use Voice Memos → export as .m4a → convert with `ffmpeg -i in.m4a -c:a libopus out.webm`
   - Android: same via a recorder app
   - Web: `MediaRecorder` in a test page, or Chrome DevTools
2. Save to the appropriate subdirectory: `samples/<lang>/`
3. Create a sibling `.json` with the expected output (see schema above)
4. Don't commit personally identifiable audio (voices of real clients, children, etc.)

## Running the suite

```bash
# Against production Vercel deployment
npm --prefix apps/calculator run voice:regression

# Or directly
cd apps/calculator && npx tsx tests/voice-regression/run.ts
```

Environment variables the runner reads:

| Var | Default | Notes |
|-----|---------|-------|
| `VOICE_API_URL` | `https://onsite-calculator.vercel.app/api/interpret` | Override for staging/local |
| `VOICE_REGRESSION_SAMPLES_DIR` | `tests/voice-regression/samples` | Where to find `.webm + .json` pairs |
| `VOICE_REGRESSION_FAIL_UNDER` | `0.95` | Pass rate threshold — runner exits non-zero below this |

## Interpreting results

Each sample produces one of:

- **PASS** — GPT's expression exactly matches (after both sides run through `sanitizeExpression`)
- **CLOSE** — expression canonicalizes to the same numeric value (e.g. `5 1/2` vs `11/2`)
- **FAIL** — different expression OR error response

The runner writes `report/latest.json` with per-sample outcomes and an aggregate pass rate.

## Cost

Each invocation burns: 1 Whisper call + 1 GPT-4o call ≈ **$0.01**.
Running the full 30-sample suite = **~$0.30**.

Don't run on every commit — this is a pre-merge gate for voice-pipeline PRs.

## Phase 2.5 — A/B test runner

`run.ts` accepts `--model <name>` to benchmark different GPT models.
Pass-rate deltas between `gpt-4o` and `gpt-4o-mini` are what the plan's
Phase 2.5 decision depends on. See the plan doc for the cost analysis.
