import { useEffect, useState } from 'react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';

/**
 * Confirms the transfer of an application into CV Screening. HR must
 * explicitly confirm the transfer; the optional remark is stored with the
 * application and written to the timeline.
 */
export default function MoveToScreeningModal({ open, row, onClose, onConfirm, loading }) {
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (open) setRemarks('');
  }, [open]);

  if (!row) return null;

  const isUnderScreening = row.status === 'under_screening';
  const isOnHold = row.status === 'on_hold';
  const isRejected = row.status === 'rejected';
  const canProceed = !isUnderScreening && !isOnHold && !isRejected;

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Move to CV Screening"
      subtitle={`${row.candidateName} · ${row.jobTitle} · ${row.applicationId}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button icon={null} onClick={() => onConfirm(remarks.trim())} loading={loading} disabled={!canProceed}>
            Move to Screening
          </Button>
        </>
      }
    >
      {isOnHold && (
        <div className="notice notice--warning">
          <div className="notice__body">
            <div className="notice__title">Application is on hold</div>
            Resume the application before moving it to screening.
          </div>
        </div>
      )}
      {isRejected && (
        <div className="notice notice--error">
          <div className="notice__body">
            <div className="notice__title">Application is rejected</div>
            A rejected application cannot be moved to screening.
          </div>
        </div>
      )}
      {isUnderScreening && (
        <div className="notice notice--info">
          <div className="notice__body">
            <div className="notice__title">Already in screening</div>
            This application has already been transferred to the CV Screening queue.
          </div>
        </div>
      )}
      {canProceed && (
        <>
          <div className="notice notice--info">
            <div className="notice__body">
              <div className="notice__title">What happens next</div>
              <ul>
                <li>The application status will change to Under Screening.</li>
                <li>A screening record will be created for this application.</li>
                <li>The candidate will appear in the CV Screening queue.</li>
                <li>The action will be recorded in the recruitment timeline.</li>
                <li>HR can continue or hold the application from the screening queue.</li>
              </ul>
            </div>
          </div>
          <Textarea
            label="HR remark"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="E.g. Application received and awaiting review."
            hint="The remark is stored with the application and shown as the latest HR remark."
          />
        </>
      )}
    </Modal>
  );
}
