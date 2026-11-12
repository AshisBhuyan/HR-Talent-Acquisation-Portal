import { BellRing, Copy, Eye, Mail, RefreshCw, Send } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import InvitationStatus from './InvitationStatus.jsx';
import { INVITATION_ACTION, INVITATION_ACTION_META } from '../../../constants/employeeStatus.js';
import { formatDate } from '../../../utils/formatDate.js';
import {
  getInitials,
  getInvitationCompletion,
} from '../../../utils/formatEmployeeData.js';
import { getInvitationAction } from '../utils/invitationActions.js';

const ACTION_ICONS = {
  [INVITATION_ACTION.RESEND_INVITATION]: RefreshCw,
  [INVITATION_ACTION.RESEND_REMINDER]: BellRing,
  [INVITATION_ACTION.REMIND_TO_SUBMIT]: BellRing,
  [INVITATION_ACTION.RENEW_AND_RESEND]: RefreshCw,
};

export default function InvitationTable({
  invitations,
  submissions = [],
  loading,
  onView,
  onProgress,
  onCopy,
  onAction,
  busyId = null,
}) {
  const columns = [
    {
      key: 'fullName',
      header: 'Employee Name',
      width: '18%',
      render: (invitation) => (
        <div className="cell-user">
          <div className="avatar">
            {invitation.fullName ? getInitials(invitation.fullName) : <Mail size={16} />}
          </div>
          <div className="cell-user__text">
            <div className="cell-user__name">
              {invitation.fullName || 'Employee invitation'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      width: '17%',
      render: (invitation) => (
        <div className="cell-email" title={invitation.email}>
          {invitation.email}
        </div>
      ),
    },
    {
      key: 'sentAt',
      header: 'Sent Date',
      width: '10%',
      render: (invitation) => (
        <div className="cell-date">
          <div>{formatDate(invitation.initialSentAt || invitation.sentAt)}</div>
          <div className="cell-muted">
            {invitation.sendCount > 1
              ? `Sent ${invitation.sendCount} times`
              : `Exp. ${formatDate(invitation.expiresAt)}`}
          </div>
        </div>
      ),
    },
    {
      key: 'completion',
      header: 'Profile Completion',
      width: '13%',
      render: (invitation) => {
        const value = getInvitationCompletion(invitation, submissions);
        return (
          <button
            type="button"
            className="mini-progress mini-progress--button"
            onClick={() => onProgress(invitation)}
            title="View profile progress"
            aria-label={`View profile progress for ${invitation.email}`}
          >
            <span className="mini-progress__track">
              <span className="mini-progress__bar" style={{ width: `${value}%` }} />
            </span>
            <span>{value}%</span>
          </button>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      render: (invitation) => <InvitationStatus status={invitation.status} />,
    },
    {
      key: 'lastReminder',
      header: 'Last Reminder Sent',
      width: '12%',
      render: (invitation) => (
        <div>
          <div>{invitation.lastReminderSentAt ? formatDate(invitation.lastReminderSentAt) : '—'}</div>
          <div className="cell-muted">
            {invitation.reminderCount
              ? `${invitation.reminderCount} reminder${invitation.reminderCount === 1 ? '' : 's'}`
              : 'No reminders yet'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '20%',
      render: (invitation) => {
        const action = getInvitationAction(invitation, submissions);
        const meta = INVITATION_ACTION_META[action];
        const isBusy = busyId === invitation.id;

        return (
          <div className="cell-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={() => onView(invitation)}
              type="button"
            >
              Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Copy}
              onClick={() => onCopy(invitation)}
              title="Copy invitation link"
              aria-label={`Copy invitation link for ${invitation.email}`}
              type="button"
            />
            {action !== INVITATION_ACTION.VIEW_DETAILS && (
              <Button
                variant="outline"
                size="sm"
                icon={ACTION_ICONS[action]}
                onClick={() => onAction(invitation, action)}
                loading={isBusy}
                disabled={Boolean(busyId) && !isBusy}
                title={meta.purpose}
                type="button"
              >
                {meta.buttonLabel}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="invitation-table">
      <DataTable
        columns={columns}
        rows={invitations}
        loading={loading}
        minWidth="1000px"
        ariaLabel="Employee invitations"
        footer={
          <>
            <span>
              Showing <strong>{invitations.length}</strong> invitation
              {invitations.length === 1 ? '' : 's'}
            </span>
            <span className="cell-muted">Reminder emails are recorded in mock mode only</span>
          </>
        }
        empty={
          <EmptyState
            icon={Send}
            title="No invitations match this view"
            description="Send a new invitation or adjust the completion and date filters."
          />
        }
      />
    </div>
  );
}
