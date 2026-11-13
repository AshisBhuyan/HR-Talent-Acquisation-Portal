import { useEffect, useState } from 'react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';

/**
 * Adds a latest HR remark to the application without changing the application
 * status.
 */
export default function RemarkModal({ open, row, onClose, onConfirm, loading }) {
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
      setError('Enter the remark before saving it.');
      return;
    }
    onConfirm(remarks.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add HR remark"
      subtitle={row ? `${row.candidateName} · ${row.applicationId}` : ''}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={loading}>
            Save remark
          </Button>
        </>
      }
    >
      {row?.remarks && (
        <div className="notice notice--neutral" style={{ marginBottom: '0.85rem' }}>
          <div className="notice__body">
            <div className="notice__title">Current remark</div>
            {row.remarks}
          </div>
        </div>
      )}
      <Textarea
        label="Remark"
        required
        value={remarks}
        error={error}
        onChange={(event) => {
          setRemarks(event.target.value);
          if (error) setError('');
        }}
        placeholder="E.g. Application received and awaiting review."
        hint="The remark is stored with the application and shown as the latest HR remark."
      />
    </Modal>
  );
}
