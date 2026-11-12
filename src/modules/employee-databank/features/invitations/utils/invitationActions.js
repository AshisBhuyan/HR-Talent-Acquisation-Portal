import { INVITATION_ACTION, INVITATION_STATUS } from '../../../constants/employeeStatus.js';
import { getInvitationCompletion } from '../../../utils/formatEmployeeData.js';

/**
 * Decides which action HR should be offered for an invitation.
 *
 * - Pending, not started        -> Resend Invitation
 * - In progress (1% - 99%)      -> Resend Reminder
 * - 100% but not submitted      -> Remind to Submit
 * - Completed                   -> View Details only (no reminder actions)
 * - Expired and incomplete      -> Renew & Resend
 */
export function getInvitationAction(invitation, submissions = []) {
  if (!invitation) return INVITATION_ACTION.VIEW_DETAILS;

  const completion = getInvitationCompletion(invitation, submissions);

  if (invitation.status === INVITATION_STATUS.COMPLETED) {
    return INVITATION_ACTION.VIEW_DETAILS;
  }

  if (invitation.status === INVITATION_STATUS.EXPIRED) {
    return INVITATION_ACTION.RENEW_AND_RESEND;
  }

  if (completion >= 100) {
    return INVITATION_ACTION.REMIND_TO_SUBMIT;
  }

  if (completion > 0) {
    return INVITATION_ACTION.RESEND_REMINDER;
  }

  return INVITATION_ACTION.RESEND_INVITATION;
}

export function isReminderAction(action) {
  return (
    action === INVITATION_ACTION.RESEND_REMINDER ||
    action === INVITATION_ACTION.REMIND_TO_SUBMIT
  );
}
