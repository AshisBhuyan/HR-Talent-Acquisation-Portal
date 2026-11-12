import { AlertCircle, BellRing, Mail, RefreshCw } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import {
  INVITATION_ACTION,
  INVITATION_ACTION_META,
} from '../../../constants/employeeStatus.js';
import { getInvitationCompletion } from '../../../utils/formatEmployeeData.js';
import { buildEmail } from '../services/emailService.js';

const ACTION_ICONS = {
  [INVITATION_ACTION.RESEND_INVITATION]: RefreshCw,
  [INVITATION_ACTION.RESEND_REMINDER]: BellRing,
  [INVITATION_ACTION.REMIND_TO_SUBMIT]: BellRing,
  [INVITATION_ACTION.RENEW_AND_RESEND]: RefreshCw,
};

const EMAIL_KIND_BY_ACTION = {
  [INVITATION_ACTION.RESEND_INVITATION]: 'resend',
  [INVITATION_ACTION.RESEND_REMINDER]: 'reminder',
  [INVITATION_ACTION.REMIND_TO_SUBMIT]: 'submit_reminder',
  [INVITATION_ACTION.RENEW_AND_RESEND]: 'renew',
};

export default function InvitationActionModal({
  open,
  invitation,
  action,
  submissions = [],
  link = '',
  onClose,
  onConfirm,
  busy = false,
}) {
  const meta = action ? INVITATION_ACTION_META[action] : null;
  const completion = invitation ? getInvitationCompletion(invitation, submissions) : 0;
  const Icon = action ? ACTION_ICONS[action] : BellRing;
  const email = invitation
    ? buildEmail({
        kind: EMAIL_KIND_BY_ACTION[action] || 'reminder',
        invitation,
        link,
      })
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={meta?.label || 'Confirm Action'}
      subtitle="Confirm the recipient before recording this action."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={Icon} onClick={onConfirm} loading={busy}>
            {meta?.label || 'Confirm'}
          </Button>
        </>
      }
    >
      {invitation && (
        <div className="reminder-confirm">
          <div className="notice notice--warning">
            <span className="notice__icon">
              <AlertCircle size={17} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Mock email delivery</div>
              No real email will be sent. The action is recorded in the invitation
              history and the mock email log.
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-item__label">Employee</div>
              <div className="detail-item__value">
                {invitation.fullName || 'Name not provided'}
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Email</div>
              <div className="detail-item__value">{invitation.email}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Current completion</div>
              <div className="detail-item__value">{completion}%</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Reminder count</div>
              <div className="detail-item__value">{invitation.reminderCount || 0}</div>
            </div>
          </div>

          <div className="notice notice--info">
            <span className="notice__icon">
              <Mail size={17} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Purpose</div>
              {meta?.purpose}
            </div>
          </div>

          {email && (
            <div className="detail-section">
              <div className="detail-section__title">
                <Mail size={16} aria-hidden="true" />
                Email preview
              </div>
              <div className="email-preview">
                <div className="email-preview__subject">
                  <span>Subject</span>
                  <strong>{email.subject}</strong>
                </div>
                <pre className="email-preview__body">{email.body}</pre>
              </div>
              <span className="field__hint">
                The employee continues from the profile that was already saved — no blank
                profile is created.
              </span>
            </div>
          )}

          {action === INVITATION_ACTION.RENEW_AND_RESEND && (
            <div className="notice notice--warning">
              <span className="notice__icon">
                <RefreshCw size={17} aria-hidden="true" />
              </span>
              <div className="notice__body">
                <div className="notice__title">Expired invitation link</div>
                A renewed invitation token is generated and the previous link stops working.
                The saved profile draft is preserved and the new link is valid for the next
                seven days.
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
