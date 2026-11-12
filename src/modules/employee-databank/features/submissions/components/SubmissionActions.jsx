import { useState } from 'react';
import { CheckCircle2, Eye, XCircle } from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import ConfirmDialog from '../../../../../shared/components/ConfirmDialog.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';
import { SUBMISSION_STATUS } from '../../../constants/employeeStatus.js';

export default function SubmissionActions({
  submission,
  onView,
  onValidate,
  onReject,
  validating = false,
  rejecting = false,
  showView = true,
  compact = false,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const isPending = submission?.status === SUBMISSION_STATUS.PENDING;
  const iconOnly = compact ? 'btn--icon' : '';

  return (
    <>
      {showView && (
        <Button
          variant="ghost"
          size="sm"
          className={iconOnly}
          icon={Eye}
          onClick={() => onView?.(submission)}
          aria-label={`Review ${submission?.employeeName || 'submission'}`}
          title="Review submission"
          type="button"
        >
          {compact ? null : 'Review'}
        </Button>
      )}

      {isPending && (
        <>
          <Button
            variant="outline"
            size="sm"
            className={iconOnly}
            icon={CheckCircle2}
            onClick={() => setConfirmOpen(true)}
            aria-label={`Validate ${submission?.employeeName || 'submission'}`}
            title="Validate submission"
            type="button"
            loading={validating}
          >
            {compact ? null : 'Validate'}
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            className={iconOnly}
            icon={XCircle}
            onClick={() => setRejectOpen(true)}
            aria-label={`Reject ${submission?.employeeName || 'submission'}`}
            title="Reject submission"
            type="button"
            loading={rejecting}
          >
            {compact ? null : 'Reject'}
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          onValidate?.(submission);
          setConfirmOpen(false);
        }}
        title="Validate employee information?"
        message={`This will create or update the current employee record for ${
          submission?.employeeName || 'this employee'
        }. The system matches on email and employee ID to avoid duplicate people.`}
        confirmLabel="Validate & Save"
        loading={validating}
      >
        <div className="notice notice--info">
          <span className="notice__icon">
            <CheckCircle2 size={17} aria-hidden="true" />
          </span>
          <div className="notice__body">
            The submission status will change to <strong>Validated</strong> and the employee will
            appear in Current Employees.
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          onReject?.(submission, rejectionReason);
          setRejectOpen(false);
          setRejectionReason('');
        }}
        title="Reject this submission?"
        message={`The submission from ${
          submission?.employeeName || 'this employee'
        } will be marked as rejected. The invitation is reopened so the employee can correct and resubmit their profile.`}
        confirmLabel="Reject submission"
        loading={rejecting}
      >
        <Textarea
          label="Rejection reason"
          optional
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Explain what needs to be corrected before resubmission."
          rows={3}
          disabled={rejecting}
        />
      </ConfirmDialog>
    </>
  );
}
