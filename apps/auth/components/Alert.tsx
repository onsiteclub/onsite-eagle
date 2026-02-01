'use client';

import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  className?: string;
}

export function Alert({ type, message, className = '' }: AlertProps) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: XCircle,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Info,
    },
  };

  const { bg, border, text, icon: Icon } = styles[type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-onsite border ${bg} ${border} ${className}`}>
      <Icon className={`w-5 h-5 ${text} flex-shrink-0 mt-0.5`} />
      <p className={`text-sm ${text}`}>{message}</p>
    </div>
  );
}
