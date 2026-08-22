import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const typeConfig = {
  success: {
    bg: 'bg-green-50',
    text: 'text-green-900',
    border: 'border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-600',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-900',
    border: 'border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-600',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-600',
  },
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border shadow-lg',
        'animate-in slide-in-from-top-2 fade-in duration-300',
        config.bg,
        config.text,
        config.border
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', config.iconColor)} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => (
  <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-[calc(100%-2rem)] max-w-md" aria-live="polite">
    {toasts.map((toast) => (
      <Toast key={toast.id} {...toast} onClose={onClose} />
    ))}
  </div>
);

type ToastContextValue = {
  addToast: (message: string, type?: ToastType) => string;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** A single application-wide toast store so notifications raised by any page are visible. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
