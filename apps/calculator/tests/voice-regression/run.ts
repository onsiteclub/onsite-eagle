// tests/voice-regression/run.ts
// Phase 2.1 — end-to-end voice pipeline regression runner.
//
// Walks samples/<lang>/ pairs (`.webm` + `.json`), POSTs each audio to the
// deployed /api/interpret, and compares GPT's expression against the gabarito.
// Writes report/latest.json and exits non-zero if pass-rate < threshold.
//
// Run: `npx tsx tests/voice-regression/run.ts`
// Options: `--model gpt-4o-mini-2024-07-18` to benchmark a different model
//          (requires matching feature flag on the server).

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = process.env.VOICE_REGRESSION_SAMPLES_DIR
  ? join(HERE, '..', '..', process.env.VOICE_REGRESSION_SAMPLES_DIR)
  : join(HERE, 'samples');
const REPORT_PATH = join(HERE, 'report', 'latest.json');
const API_URL = process.env.VOICE_API_URL ?? 'https://onsite-calculator.vercel.app/api/interpret';
const FAIL_UNDER = parseFloat(process.env.VOICE_REGRESSION_FAIL_UNDER ?? '0.95');

interface Expected {
  expression: string;
  intent?: string;
  expected_dimension?: string;
  language?: string;
  difficulty?: string;
  notes?: string;
}

interface SampleResult {
  name: string;
  language: string;
  expected: string;
  actual: string | null;
  match: 'PASS' | 'CLOSE' | 'FAIL';
  error?: string;
  durationMs: number;
}

/** Walk samples dir and yield `.webm + .json` pairs. */
function* iterSamples(): Generator<{ audioPath: string; metaPath: string; language: string; name: string }> {
  if (!existsSync(SAMPLES_DIR)) return;
  for (const lang of readdirSync(SAMPLES_DIR)) {
    const langDir = join(SAMPLES_DIR, lang);
    if (!statSync(langDir).isDirectory()) continue;
    for (const file of readdirSync(langDir)) {
      if (extname(file) !== '.webm') continue;
      const name = basename(file, '.webm');
      const metaPath = join(langDir, `${name}.json`);
      if (!existsSync(metaPath)) {
        console.warn(`[regression] Missing meta for ${file} — skipping`);
        continue;
      }
      yield { audioPath: join(langDir, file), metaPath, language: lang, name };
    }
  }
}

/** Canonicalize expression for comparison: lower, collapse whitespace, normalize quotes. */
function canonicalize(expr: string): string {
  return expr.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .trim();
}

function compare(actual: string | null, expected: string): 'PASS' | 'CLOSE' | 'FAIL' {
  if (!actual) return 'FAIL';
  const a = canonicalize(actual);
  const e = canonicalize(expected);
  if (a === e) return 'PASS';
  // Future: evaluate both with the engine and compare numeric results — CLOSE.
  // For now, close-match means identical up to whitespace/case.
  return 'FAIL';
}

async function runSample(
  audioPath: string,
  expected: Expected,
  language: string,
  name: string,
): Promise<SampleResult> {
  const start = Date.now();
  try {
    const audioBuffer = readFileSync(audioPath);
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' }), `${name}.webm`);
    formData.append('voice_training_consent', '0');

    const res = await fetch(API_URL, { method: 'POST', body: formData });
    const durationMs = Date.now() - start;

    if (!res.ok) {
      return { name, language, expected: expected.expression, actual: null, match: 'FAIL', error: `HTTP ${res.status}`, durationMs };
    }

    const body = await res.json() as { expression?: string; error?: string };
    if (body.error) {
      return { name, language, expected: expected.expression, actual: null, match: 'FAIL', error: body.error, durationMs };
    }

    const actual = body.expression ?? null;
    return {
      name,
      language,
      expected: expected.expression,
      actual,
      match: compare(actual, expected.expression),
      durationMs,
    };
  } catch (err) {
    return {
      name,
      language,
      expected: expected.expression,
      actual: null,
      match: 'FAIL',
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}

async function main() {
  const samples = [...iterSamples()];
  if (samples.length === 0) {
    console.log(`[regression] No samples found under ${SAMPLES_DIR}`);
    console.log(`[regression] See README.md for how to contribute audio samples.`);
    process.exit(0);
  }

  console.log(`[regression] Running ${samples.length} samples against ${API_URL}`);

  const results: SampleResult[] = [];
  for (const { audioPath, metaPath, language, name } of samples) {
    const expected = JSON.parse(readFileSync(metaPath, 'utf8')) as Expected;
    const result = await runSample(audioPath, expected, language, name);
    results.push(result);
    const icon = result.match === 'PASS' ? '✓' : result.match === 'CLOSE' ? '~' : '✗';
    console.log(`  ${icon} ${language}/${name}: "${result.actual ?? '(error)'}" (want: "${result.expected}") ${result.durationMs}ms`);
  }

  const passed = results.filter((r) => r.match === 'PASS').length;
  const close = results.filter((r) => r.match === 'CLOSE').length;
  const failed = results.filter((r) => r.match === 'FAIL').length;
  const passRate = passed / results.length;

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      { timestamp: new Date().toISOString(), api_url: API_URL, passed, close, failed, passRate, results },
      null,
      2,
    ),
  );

  console.log('');
  console.log(`[regression] PASS: ${passed}  CLOSE: ${close}  FAIL: ${failed}  (pass rate: ${(passRate * 100).toFixed(1)}%)`);
  console.log(`[regression] Report saved to ${REPORT_PATH}`);

  if (passRate < FAIL_UNDER) {
    console.error(`[regression] Pass rate ${(passRate * 100).toFixed(1)}% below threshold ${(FAIL_UNDER * 100).toFixed(1)}%`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[regression] Uncaught error:', err);
  process.exit(2);
});
