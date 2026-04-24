// src/parser/types.ts
// Contract between the free-text parser and the engine.
//
// Fase D: the parser is deterministic (regex + lookup, no LLM). In the future
// Whisper + GPT will emit the same shape, so the UI doesn't need to care which
// input path produced the expression — parser output is always a string the
// engine's `calculate()` can consume directly.

export type ParseResult =
  | { ok: true; expression: string }
  | { ok: false; reason: string; suggestion?: string };
