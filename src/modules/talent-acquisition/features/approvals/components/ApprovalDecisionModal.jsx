import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';
import { APPROVAL_STATUS } from '../../../constants/approvalStatus.js';
import { formatDate, formatDateTime } from '../../../utils/formatDate.js';

/**
 * Admin approval review with the approval history for audit visibility.
 */
export default function ApprovalDecisionModal({
  open,
  entry,
  onClose,
  onDecide,
  onResubmit,
  loading,
}) {
  const [status, setStatus] = useState(APPROVAL_STATUS.APPROVED);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && entry) {
      setStatus(APPROVAL_STATUS.APPROVED);
      setRemarks(entry.approval.remarks || '');
      setError('');
    }
  }, [open, entry]);

  if (!entry) return null;

  const handleDecide = () => {
    if (!remarks.trim()) {
      setError('Record the approval remarks before deciding.');
      return;
    }
    onDecide(status, remarks.trim());
  };

  const history = Array.isArray(entry.approval.history) ? entry.approval.history : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Approval · ${entry.candidate.fullName}`}
      subtitle={`${entry.job.title} · ${entry.application.applicationId}`}
      size="lg"
      footer={
        <>
          <span className="modal__footer-note">
            The approval decision is recorded separately from the HR selection.
          </span>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Close
          </Button>
          {entry.approval.status === APPROVAL_STATUS.REJECTED && (
            <Button variant="secondary" onClick={() => onResubmit(entry)} loading={loading}>
              Resubmit for approval
            </Button>
          )}
          <Button onClick={handleDecide} loading={loading} disabled={entry.approval.status === APPROVAL_STATUS.APPROVED}>
            Submit decision
          </Button>
        </>
      }
    >
      <div className="detail-grid detail-grid--3">
        <div className="detail-item">
          <div className="detail-item__label">HR recommendation</div>
          <div className="detail-item__value">
            {entry.approval.hrRecommendation === 'selected' ? 'Recommended' : 'On hold'}
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">HR remarks</div>
          <div className="detail-item__value">{entry.approval.hrRemarks || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Screening score</div>
          <div className="detail-item__value">
            {Number.isFinite(Number(entry.screening?.score))
              ? `${entry.screening.score}%`
              : 'Not scored'}
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Submission date</div>
          <div className="detail-item__value">{formatDate(entry.approval.submittedAt)}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Approval status</div>
          <div className="detail-item__value">
            <Badge variant="orange" dot>
              {entry.approval.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Decided by</div>
          <div className="detail-item__value">{entry.approval.decidedBy || '—'}</div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Interview summary</div>
        {entry.interviews.length === 0 ? (
          <p className="detail-item__value detail-item__value--muted">
            No interview feedback is available for this candidate.
          </p>
        ) : (
          <ul className="ta-detail-list">
            {entry.interviews.map((interview) => (
              <li className="ta-detail-list__item" key={interview.interviewId}>
                <div className="ta-detail-list__title">
                  {interview.round} round · {interview.interviewer}
                </div>
                <div className="ta-detail-list__meta">
                  {formatDate(interview.scheduledAt)}
                  {interview.feedback ? ` · rated ${interview.feedback.overallRating}/5` : ''}
                </div>
                {interview.feedback && (
                  <p className="ta-detail-list__text">{interview.feedback.remarks}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Approval decision</div>
        <div className="form-grid">
          <div className="field field--full">
            <span className="field__label">Decision</span>
            <div className="ta-choice-row">
              <button
                type="button"
                className={`ta-choice ${status === APPROVAL_STATUS.APPROVED ? 'active' : ''}`}
                onClick={() => setStatus(APPROVAL_STATUS.APPROVED)}
                aria-pressed={status === APPROVAL_STATUS.APPROVED}
              >
                Approve
              </button>
              <button
                type="button"
                className={`ta-choice ${status === APPROVAL_STATUS.REJECTED ? 'active' : ''}`}
                onClick={() => setStatus(APPROVAL_STATUS.REJECTED)}
                aria-pressed={status === APPROVAL_STATUS.REJECTED}
              >
                Reject
              </button>
              <button
                type="button"
                className={`ta-choice ${status === APPROVAL_STATUS.CLARIFICATION_REQUESTED ? 'active' : ''}`}
                onClick={() => setStatus(APPROVAL_STATUS.CLARIFICATION_REQUESTED)}
                aria-pressed={status === APPROVAL_STATUS.CLARIFICATION_REQUESTED}
              >
                Request Clarification
              </button>
            </div>
          </div>
          <div className="field field--full">
            <Textarea
              label="Approval remarks"
              required
              value={remarks}
              error={error}
              onChange={(event) => {
                setRemarks(event.target.value);
                if (error) setError('');
              }}
              placeholder="Explain the approval decision"
            />
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section__title">
          <History size={16} aria-hidden="true" /> Approval history
        </div>
        {history.length === 0 ? (
          <p className="detail-item__value detail-item__value--muted">
            No approval history is recorded yet.
          </p>
        ) : (
          <ol className="ta-timeline">
            {[...history].reverse().map((entry_, index) => (
              <li className="ta-timeline__item" key={`${entry_.at}-${index}`}>
                <span className="ta-timeline__dot" aria-hidden="true" />
                <div className="ta-timeline__body">
                  <div className="ta-timeline__event">{entry_.action}</div>
                  <div className="ta-timeline__meta">
                    {formatDateTime(entry_.at)} · {entry_.by}
                  </div>
                  {entry_.remarks && <div className="ta-timeline__note">{entry_.remarks}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
