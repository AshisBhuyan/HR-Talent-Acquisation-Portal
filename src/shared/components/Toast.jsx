import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (typeOrOptions, message) => {
      const options =
        typeof typeOrOptions === 'string'
          ? { type: typeOrOptions, message }
          : typeOrOptions || {};
      const toast = {
        id: `toast-${++idRef.current}`,
        type: options.type || 'success',
        message: options.message || '',
      };
      setToasts((current) => [...current, toast]);
      window.setTimeout(() => removeToast(toast.id), options.duration || 4500);
      return toast.id;
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      addToast,
      removeToast,
      success: (message) => addToast('success', message),
      error: (message) => addToast('error', message),
      info: (message) => addToast('info', message),
      warning: (message) => addToast('warning', message),
    }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <div key={toast.id} className={`toast toast--${toast.type}`}>
              <span className="toast__icon">
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="toast__message">{toast.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
}
