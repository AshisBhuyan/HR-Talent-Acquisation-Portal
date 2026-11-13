import { useEffect, useState } from 'react';
import { Mail, Send, Sparkles, RotateCw, ShieldAlert } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import ConfirmDialog from '../../../../../shared/components/ConfirmDialog.jsx';
import {
  formatDate,
  formatDateTime,
  formatTimeOfDay,
} from '../../../utils/formatDate.js';
import {
  buildInterviewInvitationEmail,
  INTERVIEW_INVITATION_STATUS,
  INTERVIEW_INVITATION_STATUS_META,
} from '../services/interviewEmailService.js';
import { getRoundLabel } from '../../../constants/interviewStatus.js';

/**
 * Interview details and the manual interview invitation email. The email is
 * sent only when an HR user clicks "Send Interview Invitation". Nothing is
 * sent after scheduling, editing or rescheduling.
 */
export default function InterviewInvitationModal({ open, entry, onClose, loading, onSend }) {
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => {
    if (!open) setConfirmSend(false);
  }, [open]);

  if (!entry) return null;

  const { interview, application, candidate, job } = entry;
  const invitation = interview.invitation || null;
  const status = invitation?.status || INTERVIEW_INVITATION_STATUS.NOT_SENT;
  const statusMeta =
    INTERVIEW_INVITATION_STATUS_META[status] || INTERVIEW_INVITATION_STATUS_META.not_sent;
  const alreadySent = status === INTERVIEW_INVITATION_STATUS.SENT;

  const { subject, body } = buildInterviewInvitationEmail({
    candidate,
    job,
    interview,
    interviewer: interview.interviewer || 'HR Recruitment Team',
  });

  const recipient = candidate.email || 'No personal email on file';
  const modeLabel = interview.mode === 'online' ? 'Online' : 'Offline';
  const dateLabel = formatDate(interview.scheduledAt);
  const timeLabel = formatTimeOfDay(interview.scheduledAt);
  const roundLabel = getRoundLabel(interview.round);

  const handleConfirm = async () => {
    setConfirmSend(false);
    await onSend(interview.interviewId);
  };

  const history = Array.isArray(invitation?.history) ? invitation.history : [];

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Interview Details"
      subtitle={`${candidate.fullName} · ${roundLabel} · ${application.applicationId}`}
      size="lg"
      footer={
        <>
          <span className="modal__footer-note">
            Email delivery currently runs in mock mode. No real email will be delivered.
          </span>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Close
          </Button>
          {alreadySent ? (
            <Button variant="secondary" icon={ShieldAlert} onClick={onClose} disabled>
              Invitation already sent
            </Button>
          ) : (
            <Button
              icon={status === INTERVIEW_INVITATION_STATUS.FAILED ? RotateCw : Send}
              onClick={() => setConfirmSend(true)}
              disabled={loading || !candidate.email}
              loading={loading}
            >
              {status === INTERVIEW_INVITATION_STATUS.FAILED
                ? 'Retry Interview Invitation'
                : 'Send Interview Invitation'}
            </Button>
          )}
        </>
      }
    >
      <section aria-label="Interview summary">
        <div className="detail-grid detail-grid--3">
          <div className="detail-item">
            <div className="detail-item__label">Candidate</div>
            <div className="detail-item__value">{candidate.fullName}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Position</div>
            <div className="detail-item__value">{job.title}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Interview round</div>
            <div className="detail-item__value">{roundLabel}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Date</div>
            <div className="detail-item__value">{dateLabel}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Time</div>
            <div className="detail-item__value">{timeLabel}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Mode</div>
            <div className="detail-item__value">{modeLabel}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Interviewer</div>
            <div className="detail-item__value">{interview.interviewer || '—'}</div>
          </div>
          <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
            <div className="detail-item__label">
              {interview.mode === 'online' ? 'Meeting link' : 'Venue'}
            </div>
            <div className="detail-item__value">
              {interview.mode === 'online'
                ? interview.meetingLink || 'Link not provided'
                : interview.location || 'Venue not provided'}
            </div>
          </div>
        </div>
      </section>

      <div className="ta-panel" style={{ marginTop: '1.25rem' }}>
        <div className="ta-panel__header">Send invitation email</div>
        <div className="ta-invitation-send">
          <div className="ta-invitation-summary">
            <div>
              <div className="detail-item__label">To</div>
              <div className="detail-item__value">{recipient}</div>
            </div>
            <div>
              <div className="detail-item__label">Status</div>
              <div className="detail-item__value">
                <Badge variant={statusMeta.variant} dot>
                  {statusMeta.label}
                  {alreadySent ? ' (Simulated)' : ''}
                </Badge>
              </div>
            </div>
            <div>
              <div className="detail-item__label">Attempts</div>
              <div className="detail-item__value">
                {invitation?.attempts ?? 0} recorded
              </div>
            </div>
          </div>

          {invitation?.error && (
            <div className="notice notice--error" role="alert">
              <div className="notice__body">{invitation.error}</div>
            </div>
          )}

          {alreadySent && (
            <p className="cell-muted" style={{ marginTop: '0.5rem' }}>
              The invitation was already sent. To avoid duplicates the action is locked; contact the
              Talent Acquisition administrator if a resend is required.
            </p>
          )}
        </div>
      </div>

      <div className="ta-panel" style={{ marginTop: '1rem' }}>
        <div className="ta-panel__header">
          <Mail size={15} aria-hidden="true" /> Email preview (simulated)
        </div>
        <div className="ta-email-preview">
          <div className="ta-email-preview__subject">{subject}</div>
          <pre className="ta-email-preview__body">{body}</pre>
        </div>
      </div>

      {history.length > 0 && (
        <div className="ta-panel" style={{ marginTop: '1rem' }}>
          <div className="ta-panel__header">Notification history</div>
          <ul className="ta-detail-list">
            {[...history].reverse().map((entryItem, index) => (
              <li className="ta-detail-list__item" key={`${entryItem.at}-${index}`}>
                <div className="ta-detail-list__title">{entryItem.action}</div>
                <div className="ta-detail-list__meta">
                  {formatDateTime(entryItem.at)}
                  {entryItem.by ? ` · ${entryItem.by}` : ''}
                  {entryItem.to ? ` · to ${entryItem.to}` : ''}
                </div>
                {entryItem.remarks && (
                  <p className="ta-detail-list__text">{entryItem.remarks}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        onConfirm={handleConfirm}
        title="Send interview invitation"
        confirmLabel="Send Invitation"
        variant="primary"
        loading={loading}
        message={`A simulated interview invitation will be recorded for ${recipient}. No real email will be delivered. Continue?`}
      >
        <div className="detail-grid" style={{ marginTop: '0.75rem' }}>
          <div className="detail-item">
            <div className="detail-item__label">Recipient</div>
            <div className="detail-item__value">{recipient}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Candidate</div>
            <div className="detail-item__value">{candidate.fullName}</div>
          </div>
        </div>
      </ConfirmDialog>
    </Modal>
  );
}
