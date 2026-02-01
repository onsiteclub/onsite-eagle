'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@onsite/supabase/client';

type Status = 'loading' | 'ready' | 'submitting' | 'success' | 'error';

export function ResetPasswordClient() {
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    // Evita processamento duplo
    if (processedRef.current) return;
    processedRef.current = true;

    const supabase = createClient();

    const processRecoveryToken = async () => {
      try {
        // 1. Extrair tokens do hash fragment
        const hash = window.location.hash;
        console.log('[ResetPassword] Hash:', hash ? 'present' : 'empty');

        if (!hash || !hash.includes('access_token')) {
          console.log('[ResetPassword] No access_token in hash');
          setError('Link inválido. Falta o token de recuperação.');
          setStatus('error');
          return;
        }

        // 2. Parse do hash fragment
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('[ResetPassword] Token type:', type);
        console.log('[ResetPassword] Has access_token:', !!accessToken);
        console.log('[ResetPassword] Has refresh_token:', !!refreshToken);

        if (!accessToken || !refreshToken) {
          console.log('[ResetPassword] Missing tokens');
          setError('Link inválido. Tokens incompletos.');
          setStatus('error');
          return;
        }

        // 3. Criar sessão com os tokens
        console.log('[ResetPassword] Setting session with tokens...');
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('[ResetPassword] Session error:', sessionError);
          setError('Link expirado ou inválido. Solicite um novo link.');
          setStatus('error');
          return;
        }

        if (data.session) {
          console.log('[ResetPassword] Session created:', data.session.user?.email);
          // Limpa o hash da URL por segurança
          window.history.replaceState(null, '', window.location.pathname);
          setStatus('ready');
        } else {
          console.log('[ResetPassword] No session returned');
          setError('Não foi possível validar o link.');
          setStatus('error');
        }
      } catch (err) {
        console.error('[ResetPassword] Unexpected error:', err);
        setError('Erro inesperado. Tente novamente.');
        setStatus('error');
      }
    };

    processRecoveryToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setStatus('submitting');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Error updating password:', error);
        setError(error.message || 'Erro ao atualizar senha. Tente novamente.');
        setStatus('ready');
        return;
      }

      // Sucesso!
      setStatus('success');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erro inesperado. Tente novamente.');
      setStatus('ready');
    }
  };

  return (
    <div className="min-h-screen bg-onsite-bg flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-onsite-dark rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-onsite-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div>
          <span className="font-bold text-onsite-text">OnSite</span>
          <span className="text-onsite-accent text-xs block">CLUB</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-onsite-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Validando link...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link Inválido</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <p className="text-sm text-gray-400">
              Volte ao app e solicite um novo link de recuperação de senha.
            </p>
          </div>
        )}

        {/* Ready State - Form */}
        {(status === 'ready' || status === 'submitting') && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Nova Senha
            </h1>
            <p className="text-gray-500 text-center mb-6">
              Digite sua nova senha abaixo
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-onsite-accent focus:border-transparent outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                    required
                    disabled={status === 'submitting'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-onsite-accent focus:border-transparent outline-none transition-all"
                  placeholder="Digite novamente"
                  required
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-onsite-accent hover:bg-onsite-accent/90 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                {status === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Atualizando...
                  </span>
                ) : (
                  'Atualizar Senha'
                )}
              </button>
            </form>
          </>
        )}

        {/* Success State - Modal */}
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Senha Atualizada!
            </h1>
            <p className="text-gray-500 mb-6">
              Sua senha foi alterada com sucesso.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-onsite-accent mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Próximo passo</p>
                  <p className="text-gray-500 text-sm">
                    Volte ao app e faça login com sua nova senha.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400">
                  Você pode fechar esta janela
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-sm mt-8">
        © 2026 OnSite Club. Todos os direitos reservados.
      </p>
    </div>
  );
}
