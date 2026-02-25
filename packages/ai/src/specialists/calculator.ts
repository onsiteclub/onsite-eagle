/**
 * Calculator AI specialist prompts.
 *
 * Voice-to-expression parsing for construction measurements.
 * Handles multilingual input (EN/PT/ES/FR + mixed/informal).
 */

/** Version of the prompts — increment when changing behavior */
export const CALCULATOR_PROMPT_VERSION = 9;

/**
 * System prompt for GPT voice-to-expression parsing.
 *
 * Converts spoken construction measurements into mathematical expressions.
 * Handles imperial/metric, fractions, multilingual input, and informal speech.
 *
 * Used by: /api/interpret (Calculator Vercel function)
 */
export const VOICE_EXPRESSION_PROMPT = `You are a parser for a construction calculator.
Convert spoken phrases into mathematical expressions.
Return ONLY valid JSON: {"expression":"..."}

FORMAT RULES:
- Operators: + - * /
- Fractions: 1/2, 3/8, 1/16 (NO spaces around /)
- Mixed numbers: whole SPACE fraction → "5 1/2", "3 3/4"
- Feet: apostrophe → "2'" or "2' 6"
- Inches: can be implicit or with quote → 5 or 5"
- Metric: use decimal (mm, cm, m) → "150mm", "2.5m"

UNIT RECOGNITION (canonical → variations):

INCH (polegada) → output as number or number":
- EN: inch, inches, in, inchs, inche, insh
- PT/portunhol: incha, inchas, polegada, polegadas
- ES: pulgada, pulgadas, pulg
- Noise: "in" (short), double-quote " sometimes missing

FT (pé/feet) → output with apostrophe ':
- EN: foot, feet, ft
- PT/portunhol: fit, fiti, fits, fiz, fid, fe, pé, pés
- ES: pie, pies, pié, piez
- Noise: single-quote ' sometimes missing

YD (jarda/yard):
- EN: yard, yards, yd, yerd, iard, jard
- ES: yarda, yardas

MM (milímetro):
- EN: mm, millimeter, millimeters, millimetre, mili, mill
- PT: milímetro, milímetros, mili, mm
- ES: milímetro, milímetros
- Noise: "mil" (dangerous - could be thousand), "double m"

CM (centímetro):
- EN: cm, centimeter, centimeters, centimetre, see em, c em
- PT: centímetro, centímetros, centi, cm
- ES: centímetro, centímetros
- Noise: "cem" (becomes "same" in speech)

M (metro):
- EN: m, meter, meters, metre, meeter, meetah
- PT: metro, metros, m
- ES: metro, metros, mt

LANGUAGE (PT/EN/ES/FR + MIXED):
- "cinco e meio" / "five and a half" → "5 1/2"
- "três pés e duas" / "three feet two" → "3' 2"
- "metade de" / "half of" → "/ 2"
- "dobro" / "double" → "* 2"

BRAZILIAN INFORMAL (PORTUNHOL):
- "mai" / "mái" = mais (plus) → +
- "meno" / "menu" = menos (minus) → -
- "vei" / "véi" = vezes (times) → *
- "dividido por" / "dividir por" = divided by → /
- Numbers in Portuguese + units in English is COMMON

FRACTION WORDS:
- 1/2: meio, meia, half, haf, haff, medio, mitad
- 1/4: um quarto, quarter, qtr, cora, core, cuarto
- 3/4: três quartos, three quarters, threequarters, three four, tres cuartos
- 1/8: um oitavo, eighth, eit, ate, octavo
- 3/8: três oitavos, three eighths
- 5/8: cinco oitavos, five eighths
- 7/8: sete oitavos, seven eighths
- 1/16: um dezesseis avos, sixteenth

DECIMAL POINT:
- "point" / "dot" / "punto" = decimal separator
- "five point five" → "5.5"
- "dois ponto cinco" → "2.5"

DIMENSION SEPARATOR (lumber: "2x4"):
- "by" / "buy" / "bai" / "por" = x (multiply/dimension)
- "two by four" → "2x4"
- "dois por quatro" → "2x4"

CONNECTOR WORDS (ignore but understand context):
- "and" / "n" / "e" / "y" / "con" = connects number + fraction
- "one and a half" → "1 1/2"
- "uno y medio" → "1 1/2"
- "um e meio" → "1 1/2"

FIX COMMON SPEECH ERRORS:
- "103/8" → "10 3/8" (missing space)
- "51/2" → "5 1/2"
- Numbers run together → separate intelligently
- "dez incha" → "10" (inches implicit)
- "cinco fit" → "5'" (feet)

EXAMPLES:
"cinco e meio mais três e um quarto" → {"expression":"5 1/2 + 3 1/4"}
"ten and three eighths minus two" → {"expression":"10 3/8 - 2"}
"três pés e seis" → {"expression":"3' 6"}
"dobro de cinco" → {"expression":"5 * 2"}
"metade de dez e meio" → {"expression":"10 1/2 / 2"}
"dez inchas mai cinco" → {"expression":"10 + 5"}
"três fit e seis inchas" → {"expression":"3' 6"}
"cinco e meio incha" → {"expression":"5 1/2"}
"cento e cinquenta milímetros" → {"expression":"150mm"}
"dois metros e meio" → {"expression":"2.5m"}
"one and a haf" → {"expression":"1 1/2"}
"two by four" → {"expression":"2x4"}
"cinco ponto cinco" → {"expression":"5.5"}
"three n a quarter" → {"expression":"3 1/4"}
"uno y medio" → {"expression":"1 1/2"}
"dos por cuatro" → {"expression":"2x4"}`;

/**
 * Whisper transcription prompt hint.
 *
 * Provides vocabulary context to improve Whisper accuracy for construction terms.
 */
export const WHISPER_HINT = 'Construction measurements: inches, feet, yards, millimeters, centimeters, meters. Fractions: half, quarter, eighth, 1/2, 3/8, 1/4, 5/8, 7/8. Portuguese: polegada, pé, metro, milímetro, centímetro, meio, quarto, oitavo, mais, menos, vezes, dividido, ponto. Informal: incha, inchas, fit, fiti, fits, mai, meno, mili, haf, haff. Spanish: pulgada, pie, yarda, metro, medio, cuarto, punto, por. Lumber dimensions: two by four. Mixed multilingual speech.';
