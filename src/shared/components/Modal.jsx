import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  labelledBy,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm' ? 'modal--sm' : size === 'lg' ? 'modal--lg' : size === 'xl' ? 'modal--xl' : '';

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`modal ${sizeClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? 'modal-title' : undefined)}
      >
        {(title || onClose) && (
          <div className="modal__header">
            <div className="modal__heading">
              {title && (
                <h2 className="modal__title" id="modal-title">
                  {title}
                </h2>
              )}
              {subtitle && <p className="modal__subtitle">{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
