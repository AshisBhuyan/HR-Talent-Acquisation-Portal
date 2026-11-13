import { useEffect, useState } from 'react';
import ConfirmDialog from '../../../../../shared/components/ConfirmDialog.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';

/**
 * Rejects an application after the HR user records the reason. The remark is
 * stored with the workflow transition.
 */
export default function RejectApplicationModal({ open, row, onClose, onConfirm, loading }) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRemarks('');
      setError('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!remarks.trim()) {
      setError('Record the reason for rejecting this application.');
      return;
    }
    onConfirm(remarks.trim());
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      loading={loading}
      title="Reject application"
      confirmLabel="Reject application"
      message={
        row
          ? `${row.candidateName} applied for ${row.jobTitle}. The application will be moved to the rejected state and the reason is stored in the timeline.`
          : 'The application will be moved to the rejected state.'
      }
    >
      <Textarea
        label="Reason for rejection"
        required
        error={error}
        value={remarks}
        onChange={(event) => {
          setRemarks(event.target.value);
          if (error) setError('');
        }}
        placeholder="Describe why the application is not progressing"
      />
    </ConfirmDialog>
  );
}
