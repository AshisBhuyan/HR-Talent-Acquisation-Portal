import { useEffect, useState } from 'react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';

/**
 * Collects the remark for a shortlisting action (hold, resume or reject).
 */
export default function ShortlistActionModal({
  open,
  mode = 'hold',
  row,
  onClose,
  onConfirm,
  loading,
}) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRemarks('');
      setError('');
    }
  }, [open]);

  const isReject = mode === 'reject';
  const copy = {
    reject: {
      title: 'Reject candidate',
      label: 'Reason for rejection',
      required: true,
      placeholder: 'Describe why the candidate is not progressing',
      confirm: 'Reject candidate',
      variant: 'danger',
    },
    resume: {
      title: 'Resume candidate',
      label: 'Reason for the resume',
      required: false,
      placeholder: 'Explain why the candidate is back in the running',
      confirm: 'Resume candidate',
      variant: 'primary',
    },
    hold: {
      title: 'Put candidate on hold',
      label: 'Reason for the hold',
      required: false,
      placeholder: 'Explain what is blocking the shortlist',
      confirm: 'Put on hold',
      variant: 'primary',
    },
  }[mode] || {
    title: 'Put candidate on hold',
    label: 'Reason for the hold',
    required: false,
    placeholder: 'Explain what is blocking the shortlist',
    confirm: 'Put on hold',
    variant: 'primary',
  };

  const handleConfirm = () => {
    if (isReject && !remarks.trim()) {
      setError('Record the reason for rejecting the candidate.');
      return;
    }
    onConfirm(remarks.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      subtitle={row ? `${row.candidate.fullName} · ${row.job.title}` : ''}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={copy.variant}
            onClick={handleConfirm}
            loading={loading}
          >
            {copy.confirm}
          </Button>
        </>
      }
    >
      <Textarea
        label={copy.label}
        required={copy.required}
        error={error}
        value={remarks}
        onChange={(event) => {
          setRemarks(event.target.value);
          if (error) setError('');
        }}
        placeholder={copy.placeholder}
      />
    </Modal>
  );
}
