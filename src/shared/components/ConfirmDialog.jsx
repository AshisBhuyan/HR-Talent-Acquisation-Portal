import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  children,
}) {
  return (
    <Modal open={open} onClose={loading ? undefined : onClose} size="sm" title={title}>
      <div className={`notice notice--${variant === 'danger' ? 'error' : 'warning'}`}>
        <span className="notice__icon">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">{message}</div>
      </div>
      {children && <div style={{ marginTop: '1rem' }}>{children}</div>}
      <div className="form-actions">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
