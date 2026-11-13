import { useEffect, useState } from 'react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import { Textarea } from '../../../../../shared/components/Input.jsx';
import { SELECTION_STATUS, SELECTION_STATUS_META } from '../../../constants/selectionStatus.js';
import { formatDate } from '../../../utils/formatDate.js';
import { getRoundLabel } from '../../../constants/interviewStatus.js';

/**
 * Final selection review. It shows the interview feedback, the screening
 * result and the HR remarks, and records the HR decision.
 */
export default function SelectionDecisionModal({
  open,
  entry,
  onClose,
  onDecide,
  onSubmitForApproval,
  loading,
}) {
  const [decision, setDecision] = useState(SELECTION_STATUS.SELECTED);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && entry) {
      setDecision(entry.selection?.decision || SELECTION_STATUS.SELECTED);
      setRemarks(entry.selection?.remarks || '');
      setError('');
    }
  }, [open, entry]);

  if (!entry) return null;

  const handleDecide = () => {
    if (!remarks.trim()) {
      setError('Record the remarks of the final decision.');
      return;
    }
    onDecide(decision, remarks.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Final selection · ${entry.candidate.fullName}`}
      subtitle={`${entry.job.title} · ${entry.application.applicationId}`}
      size="xl"
      footer={
        <>
          <span className="modal__footer-note">
            The HR decision is submitted to the admin approval stage separately.
          </span>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Close
          </Button>
          {entry.selection?.decision === 'selected' && !entry.selection?.submittedForApproval && (
            <Button variant="secondary" onClick={() => onSubmitForApproval(entry)} loading={loading}>
              Submit for Admin Approval
            </Button>
          )}
          <Button onClick={handleDecide} loading={loading}>
            Record decision
          </Button>
        </>
      }
    >
      <div className="ta-screening-layout">
        <div className="ta-screening-layout__main">
          <section className="ta-panel">
            <div className="ta-panel__header">Candidate evaluation</div>
            <div className="detail-grid detail-grid--3">
              <div className="detail-item">
                <div className="detail-item__label">Position</div>
                <div className="detail-item__value">{entry.job.title}</div>
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
                <div className="detail-item__label">Average interview rating</div>
                <div className="detail-item__value">
                  {entry.averageRating ? `${entry.averageRating}/5` : 'Not rated'}
                </div>
              </div>
            </div>
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">Interview feedback</div>
            {entry.interviews.length === 0 ? (
              <p className="detail-item__value detail-item__value--muted">
                No interview feedback has been recorded.
              </p>
            ) : (
              <ul className="ta-detail-list">
                {entry.interviews.map((interview) => (
                  <li className="ta-detail-list__item" key={interview.interviewId}>
                    <div className="ta-detail-list__title">
                      {getRoundLabel(interview.round)} · {interview.interviewer}
                    </div>
                    <div className="ta-detail-list__meta">
                      {formatDate(interview.scheduledAt)}
                      {interview.feedback
                        ? ` · rated ${interview.feedback.overallRating}/5`
                        : ' · feedback pending'}
                    </div>
                    {interview.feedback && (
                      <>
                        <div className="ta-detail-list__meta">
                          Recommendation:{' '}
                          {interview.feedback.recommendation.replace(/_/g, ' ')}
                        </div>
                        <p className="ta-detail-list__text">{interview.feedback.remarks}</p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ta-panel">
            <div className="ta-panel__header">HR decision</div>
            <div className="form-grid">
              <div className="field field--full">
                <span className="field__label">Final recommendation</span>
                <div className="ta-choice-row">
                  {Object.values(SELECTION_STATUS).map((value) => {
                    const meta = SELECTION_STATUS_META[value];
                    return (
                      <button
                        type="button"
                        key={value}
                        className={`ta-choice ${decision === value ? 'active' : ''}`}
                        onClick={() => setDecision(value)}
                        aria-pressed={decision === value}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="field field--full">
                <Textarea
                  label="Decision remarks"
                  required
                  value={remarks}
                  error={error}
                  onChange={(event) => {
                    setRemarks(event.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Summarise the hiring recommendation"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="ta-screening-layout__side">
          <div className="ta-panel">
            <div className="ta-panel__header">Current state</div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">Application stage</div>
                <div className="detail-item__value">
                  <Badge variant="grey">{entry.application.status.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Decision recorded</div>
                <div className="detail-item__value">
                  {entry.selection ? formatDate(entry.selection.decidedAt) : 'Not recorded'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Approval state</div>
                <div className="detail-item__value">
                  {entry.approval ? (
                    entry.approval.status.replace(/_/g, ' ')
                  ) : 'Not submitted for approval'}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
