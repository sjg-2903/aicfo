import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

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
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border',
        'animate-in slide-in-from-top-2 fade-in duration-300',
        config.bg,
        config.text,
        config.border
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', config.iconColor)} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-black/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast container for displaying multiple toasts
interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
};
