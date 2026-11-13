import { useEffect, useState } from 'react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';

/**
 * Collects the remark for a shortlisting action (hold or reject).
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
      title={isReject ? 'Reject candidate' : 'Put candidate on hold'}
      subtitle={row ? `${row.candidate.fullName} · ${row.job.title}` : ''}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={isReject ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
          >
            {isReject ? 'Reject candidate' : 'Put on hold'}
          </Button>
        </>
      }
    >
      <Textarea
        label={isReject ? 'Reason for rejection' : 'Reason for the hold'}
        required={isReject}
        error={error}
        value={remarks}
        onChange={(event) => {
          setRemarks(event.target.value);
          if (error) setError('');
        }}
        placeholder={
          isReject
            ? 'Describe why the candidate is not progressing'
            : 'Explain what is blocking the shortlist'
        }
      />
    </Modal>
  );
}
