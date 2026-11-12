import { CheckCircle2, Circle, FileText, ListChecks } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import {
  ONBOARDING_COMPLETION_FIELDS,
  PROFILE_COMPLETION_FIELD_LABELS,
} from '../../../constants/employeeStatus.js';
import { formatDateTime } from '../../../utils/formatDate.js';
import {
  getInvitationCompletion,
  getProfileCompletionDetails,
} from '../../../utils/formatEmployeeData.js';

export default function InvitationProgressModal({
  open,
  invitation,
  submissions = [],
  onClose,
}) {
  const submission = invitation?.submissionId
    ? submissions.find((item) => item.id === invitation.submissionId)
    : null;
  const profileData = invitation?.profileDraft || submission?.data || {};
  const completion = invitation
    ? getInvitationCompletion(invitation, submissions)
    : 0;
  const details = getProfileCompletionDetails(profileData);
  const missingPaths = new Set(details.missingFields.map((field) => field.path));
  const hasCv = Boolean(profileData.cv);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile Progress"
      subtitle={invitation?.email}
      size="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {invitation && (
        <div className="invitation-progress">
          <div className="form-progress">
            <div className="form-progress__head">
              <span>Profile completeness</span>
              <strong>{completion}%</strong>
            </div>
            <div
              className="form-progress__track"
              role="progressbar"
              aria-valuenow={completion}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="form-progress__bar" style={{ width: `${completion}%` }} />
            </div>
          </div>

          <div className="progress-summary">
            <span>
              <strong>{details.completedCount}</strong> of{' '}
              <strong>{details.totalCount}</strong> required fields completed
            </span>
            <Badge variant={hasCv ? 'green' : 'grey'}>
              <FileText size={12} aria-hidden="true" />
              {hasCv ? 'CV attached' : 'No CV yet'}
            </Badge>
          </div>

          <div className="detail-section">
            <div className="detail-section__title">
              <ListChecks size={16} aria-hidden="true" />
              Required fields
            </div>
            <ul className="progress-checklist">
              {ONBOARDING_COMPLETION_FIELDS.map((field) => {
                const complete = !missingPaths.has(field);
                return (
                  <li
                    key={field}
                    className={`progress-checklist__item ${
                      complete ? 'progress-checklist__item--done' : ''
                    }`}
                  >
                    {complete ? (
                      <CheckCircle2 size={15} aria-hidden="true" />
                    ) : (
                      <Circle size={15} aria-hidden="true" />
                    )}
                    <span>{PROFILE_COMPLETION_FIELD_LABELS[field] || field}</span>
                    <span className="progress-checklist__state">
                      {complete ? 'Completed' : 'Not completed'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="progress-meta">
            <span>
              Last draft saved:{' '}
              <strong>
                {invitation.draftUpdatedAt
                  ? formatDateTime(invitation.draftUpdatedAt)
                  : 'No saved draft yet'}
              </strong>
            </span>
            {invitation.lastReminderSentAt && (
              <span>
                Last reminder:{' '}
                <strong>{formatDateTime(invitation.lastReminderSentAt)}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
