// src/hooks/index.ts
// Exporta hooks ativos do app

export { useOnlineStatus } from './useOnlineStatus';
export { useVoiceRecorder } from './useVoiceRecorder';
export { useCalculator } from './useCalculator';
export { useCalculatorHistory } from './useCalculatorHistory';

// Hooks disponíveis mas não integrados ainda:
// - useAuth: gerenciamento de estado de autenticação
// - useDeepLink: callbacks OAuth para mobile
// - useVoiceUsage: limite de 50 usos gratuitos de voz
