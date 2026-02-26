// src/components/Toast.tsx
// Toast notification component with auto-dismiss

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'info' | 'success';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgClass =
    type === 'error' ? 'toast-error' :
    type === 'success' ? 'toast-success' :
    'toast-info';

  return (
    <div className={`toast ${bgClass}`} onClick={onClose} role="alert">
      <span className="toast-message">{message}</span>
    </div>
  );
}
