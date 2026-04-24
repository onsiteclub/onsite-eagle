// src/parser/tables.ts
// Lookup tables for deterministic PT/EN → engine-expression translation.
//
// Keys are post-normalization (lowercase, no accents). Order inside each table
// matters only where one key is a prefix of another (e.g. "dezesseis" before
// "dez") — longest-match replacement handles that at the call site.

// ============================================================================
// UNITS
// ============================================================================
// Feet/inches use the engine's native apostrophe/quote grammar.
// Metric units pass through verbatim; the engine rejects them today — that
// surfaces an honest "can't mix metric + imperial yet" error instead of silent
// wrong math.

export const UNIT_MAP: ReadonlyArray<readonly [string, string]> = [
  // Feet — Portuguese
  ['pes', "'"],
  ['pe', "'"],
  // Feet — English
  ['feet', "'"],
  ['foot', "'"],
  ['ft', "'"],
  // Inches — Portuguese
  ['polegadas', '"'],
  ['polegada', '"'],
  // Inches — English
  ['inches', '"'],
  ['inch', '"'],
  ['in', '"'],
  // Metric (pass-through — engine handles scalar math)
  ['metros', 'm'],
  ['metro', 'm'],
  ['meters', 'm'],
  ['meter', 'm'],
  ['centimetros', 'cm'],
  ['centimetro', 'cm'],
  ['centimeters', 'cm'],
  ['centimeter', 'cm'],
  ['milimetros', 'mm'],
  ['milimetro', 'mm'],
  ['millimeters', 'mm'],
  ['millimeter', 'mm'],
];

// ============================================================================
// OPERATORS
// ============================================================================
// Multi-word phrases must come before single words (handled by longest-match
// in the replacement pipeline).

export const OPERATOR_PHRASES: ReadonlyArray<readonly [string, string]> = [
  // Division — multi-word first
  ['dividido por', '/'],
  ['divided by', '/'],
  ['sobre', '/'],
  ['over', '/'],
  // Multiplication — multi-word first
  ['multiplicado por', '*'],
  ['multiplied by', '*'],
  ['vezes', '*'],
  ['times', '*'],
  // Addition
  ['mais', '+'],
  ['plus', '+'],
  // Subtraction — "minus" ambiguous with negative; only treat when standalone
  ['menos', '-'],
  ['minus', '-'],
];

// "por" (PT) / "by" (EN) between numbers = multiplication (area/volume shape).
// "de" (PT) / "of" (EN) after a percentage = implicit multiplication base.
// These are handled contextually in index.ts, not via this table.

// ============================================================================
// NUMBER WORDS — cardinals
// ============================================================================

export const NUMBER_WORDS: ReadonlyArray<readonly [string, number]> = [
  // Portuguese — units
  ['zero', 0],
  ['um', 1],
  ['uma', 1],
  ['dois', 2],
  ['duas', 2],
  ['tres', 3],
  ['quatro', 4],
  ['cinco', 5],
  ['seis', 6],
  ['sete', 7],
  ['oito', 8],
  ['nove', 9],
  ['dez', 10],
  ['onze', 11],
  ['doze', 12],
  ['treze', 13],
  ['quatorze', 14],
  ['catorze', 14],
  ['quinze', 15],
  ['dezesseis', 16],
  ['dezessete', 17],
  ['dezoito', 18],
  ['dezenove', 19],
  ['vinte', 20],
  ['trinta', 30],
  ['quarenta', 40],
  ['cinquenta', 50],
  ['sessenta', 60],
  ['setenta', 70],
  ['oitenta', 80],
  ['noventa', 90],
  ['cem', 100],
  ['cento', 100],
  // English — units
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['thirteen', 13],
  ['fourteen', 14],
  ['fifteen', 15],
  ['sixteen', 16],
  ['seventeen', 17],
  ['eighteen', 18],
  ['nineteen', 19],
  ['twenty', 20],
  ['thirty', 30],
  ['forty', 40],
  ['fifty', 50],
  ['sixty', 60],
  ['seventy', 70],
  ['eighty', 80],
  ['ninety', 90],
  ['hundred', 100],
];

// ============================================================================
// FRACTION WORDS
// ============================================================================
// Construction-common imperial fractions. Emitted as "1/N" strings that the
// engine tokenizer recognizes directly (parseToInches handles them).

export const FRACTION_WORDS: ReadonlyArray<readonly [string, string]> = [
  // "meio" stands alone in PT, "half" in EN
  ['meio', '1/2'],
  ['meia', '1/2'],
  ['half', '1/2'],
  // Quarters
  ['um quarto', '1/4'],
  ['tres quartos', '3/4'],
  ['dois quartos', '2/4'],
  ['one quarter', '1/4'],
  ['three quarters', '3/4'],
  ['two quarters', '2/4'],
  ['a quarter', '1/4'],
  // Eighths
  ['um oitavo', '1/8'],
  ['tres oitavos', '3/8'],
  ['cinco oitavos', '5/8'],
  ['sete oitavos', '7/8'],
  ['one eighth', '1/8'],
  ['three eighths', '3/8'],
  ['five eighths', '5/8'],
  ['seven eighths', '7/8'],
  // Sixteenths — construction-common
  ['um dezesseis avos', '1/16'],
  ['tres dezesseis avos', '3/16'],
];

// ============================================================================
// PERCENT WORDS
// ============================================================================

export const PERCENT_WORDS: ReadonlyArray<string> = [
  'por cento',
  'percent',
  'pct',
];
