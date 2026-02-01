// src/lib/calculator/index.ts
// API pública do calculator engine

export {
  calculate,
  parseToInches,
  formatInches,
  formatTotalInches,
} from './engine';

export type { CalculationResult } from '../../types/calculator';

// Funções internas disponíveis em engine.ts se necessário:
// - formatNumber: formata números com precisão
// - tokenize: tokeniza expressões matemáticas
// - evaluateTokens: avalia tokens em resultado
