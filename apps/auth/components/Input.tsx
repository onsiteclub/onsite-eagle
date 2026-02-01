'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, type, className = '', ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={`input-field ${isPassword ? 'pr-12' : ''} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-onsite-text-muted hover:text-onsite-text-secondary transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
