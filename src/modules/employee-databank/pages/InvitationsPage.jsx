import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Copy,
  ExternalLink,
  History,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import Modal from '../../../shared/components/Modal.jsx';
import Badge from '../../../shared/components/Badge.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import EmployeeSearch from '../components/EmployeeSearch.jsx';
import EmployeeFilters from '../components/EmployeeFilters.jsx';
import InvitationTable from '../features/invitations/components/InvitationTable.jsx';
import InvitationStatus from '../features/invitations/components/InvitationStatus.jsx';
import InvitationProgressModal from '../features/invitations/components/InvitationProgressModal.jsx';
import InvitationActionModal from '../features/invitations/components/InvitationActionModal.jsx';
import useInvitations from '../features/invitations/hooks/useInvitations.js';
import emailService from '../features/invitations/services/emailService.js';
import { useDatabank } from '../context/DatabankContext.jsx';
import {
  INVITATION_ACTION,
  INVITATION_ACTION_META,
  INVITATION_STATUS,
  INVITATION_STATUS_OPTIONS,
} from '../constants/employeeStatus.js';
import { formatDateTime } from '../utils/formatDate.js';
import { getInvitationCompletion } from '../utils/formatEmployeeData.js';
import { getInvitationAction } from '../features/invitations/utils/invitationActions.js';

const DAY_MS = 86400000;

const COMPLETION_OPTIONS = [
  { value: 'not_started', label: 'Not started (0%)' },
  { value: 'in_progress', label: 'In progress (1–99%)' },
  { value: 'complete', label: 'Complete (100%)' },
];

const DATE_OPTIONS = [
  { value: '7', label: 'Invited in last 7 days' },
  { value: '30', label: 'Invited in last 30 days' },
  { value: '90', label: 'Invited in last 90 days' },
];

function inviteLink(token) {
  return `${window.location.origin}/employee-invite/${token}`;
}

function matchesCompletion(completion, filter) {
  if (!filter) return true;
  if (filter === 'not_started') return completion === 0;
  if (filter === 'in_progress') return completion > 0 && completion < 100;
  if (filter === 'complete') return completion === 100;
  return true;
}

function buildActivity(invitation) {
  if (!invitation) return [];

  const events = [
    {
      label: 'Invitation sent',
      at: invitation.initialSentAt || invitation.createdAt,
    },
    invitation.openedAt && {
      label: 'Invitation opened',
      at: invitation.openedAt,
    },
    invitation.emailVerifiedAt && {
      label: 'Email verified',
      at: invitation.emailVerifiedAt,
    },
    invitation.draftUpdatedAt && {
      label: 'Profile draft last saved',
      at: invitation.draftUpdatedAt,
    },
    invitation.tokenRenewedAt && {
      label: 'Invitation token renewed',
      at: invitation.tokenRenewedAt,
    },
    invitation.completedAt && {
      label: 'Profile submitted',
      at: invitation.completedAt,
    },
  ];

  return events
    .filter((event) => event && event.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default function InvitationsPage() {
  const { invitations, loading, resendInvitation, renewInvitation, sendReminder } =
    useInvitations();
  const { submissions } = useDatabank();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [completionFilter, setCompletionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const [progressId, setProgressId] = useState(null);
  const [actionTargetId, setActionTargetId] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [emailEvents, setEmailEvents] = useState([]);

  const loadEmailEvents = useCallback(async () => {
    const events = await emailService.getEmailEvents();
    setEmailEvents(events);
  }, []);

  useEffect(() => {
    loadEmailEvents();
  }, [loadEmailEvents, invitations]);

  const viewing = invitations.find((invitation) => invitation.id === viewingId) || null;
  const progressInvitation =
    invitations.find((invitation) => invitation.id === progressId) || null;
  const actionTarget =
    invitations.find((invitation) => invitation.id === actionTargetId) || null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return invitations.filter((invitation) => {
      const matchesTerm =
        !term ||
        [invitation.email, invitation.fullName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = !status || invitation.status === status;
      const completion = getInvitationCompletion(invitation, submissions);
      const invitedAt = new Date(
        invitation.initialSentAt || invitation.sentAt || invitation.createdAt || 0
      ).getTime();
      const inDateRange =
        !dateFilter ||
        (Number.isFinite(invitedAt) && Date.now() - invitedAt <= Number(dateFilter) * DAY_MS);

      return (
        matchesTerm &&
        matchesStatus &&
        matchesCompletion(completion, completionFilter) &&
        inDateRange
      );
    });
  }, [invitations, search, status, completionFilter, dateFilter, submissions]);

  const handleOpenAction = (invitation, action) => {
    setViewingId(null);
    setActionTargetId(invitation.id);
    setActionType(action);
  };

  const handleConfirmAction = async () => {
    if (!actionTarget || !actionType || busyId) return;

    setBusyId(actionTarget.id);
    try {
      if (actionType === INVITATION_ACTION.RESEND_INVITATION) {
        await resendInvitation(actionTarget.id);
        toast.success(
          `Invitation resent for ${actionTarget.email} in mock mode. The expiry date was extended; no real email was sent.`
        );
      } else if (actionType === INVITATION_ACTION.RENEW_AND_RESEND) {
        await renewInvitation(actionTarget.id);
        toast.success(
          `Invitation renewed for ${actionTarget.email} in mock mode. The previous link is no longer valid; no real email was sent.`
        );
      } else if (actionType === INVITATION_ACTION.REMIND_TO_SUBMIT) {
        await sendReminder(actionTarget.id, { purpose: 'submit' });
        toast.success(
          `Reminder to submit recorded for ${actionTarget.email} in mock mode. No real email was sent.`
        );
      } else {
        await sendReminder(actionTarget.id, { purpose: 'reminder' });
        toast.success(
          `Reminder recorded for ${actionTarget.email} in mock mode. No real email was sent.`
        );
      }

      setActionTargetId(null);
      setActionType(null);
    } catch (error) {
      toast.error(error.message || 'The invitation action could not be completed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = async (invitation) => {
    try {
      await navigator.clipboard.writeText(inviteLink(invitation.token));
      toast.success('Invitation link copied to clipboard.');
    } catch {
      toast.error('Could not copy automatically. Select the link and copy it manually.');
    }
  };

  const viewingCompletion = viewing ? getInvitationCompletion(viewing, submissions) : 0;
  const viewingActivity = buildActivity(viewing);
  const viewingReminders = viewing?.reminders || [];
  const viewingAction = viewing ? getInvitationAction(viewing, submissions) : null;
  const viewingEmails = viewing
    ? emailEvents.filter((event) => event.invitationId === viewing.id)
    : [];

  return (
    <div className="page">
      <PageHeader
        title="Invitations"
        subtitle="Track profile completion, reminder history, and invitation status. Invitation and reminder emails are mocked in this frontend build."
      />

      <div className="page-toolbar">
        <EmployeeSearch
          value={search}
          onChange={setSearch}
          label="Search invitations"
          placeholder="Search invitations by employee email or name…"
        />
        <EmployeeFilters
          filters={[
            {
              key: 'status',
              label: 'Statuses',
              placeholder: 'All Statuses',
              value: status,
              onChange: setStatus,
              options: INVITATION_STATUS_OPTIONS,
            },
            {
              key: 'completion',
              label: 'Profile completion',
              placeholder: 'All Completion Levels',
              value: completionFilter,
              onChange: setCompletionFilter,
              options: COMPLETION_OPTIONS,
            },
            {
              key: 'date',
              label: 'Invitation date',
              placeholder: 'Any Invitation Date',
              value: dateFilter,
              onChange: setDateFilter,
              options: DATE_OPTIONS,
            },
          ]}
          onClear={() => {
            setSearch('');
            setStatus('');
            setCompletionFilter('');
            setDateFilter('');
          }}
        />
        <div className="page-toolbar__spacer" />
        <span className="filters-summary">
          {loading ? 'Loading invitations…' : `${filtered.length} invitations`}
        </span>
      </div>

      <div className="notice notice--warning">
        <span className="notice__icon">
          <Mail size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">Mock email delivery is active</div>
          No real invitation or reminder email is sent from this frontend. Profile drafts and
          reminder records are stored locally. Connect the service layer to a secure backend
          before production.
        </div>
      </div>

      <InvitationTable
        invitations={filtered}
        submissions={submissions}
        loading={loading}
        onView={(invitation) => setViewingId(invitation.id)}
        onProgress={(invitation) => setProgressId(invitation.id)}
        onCopy={handleCopy}
        onAction={handleOpenAction}
        busyId={busyId}
      />

      <InvitationProgressModal
        open={Boolean(progressInvitation)}
        invitation={progressInvitation}
        submissions={submissions}
        onClose={() => setProgressId(null)}
      />

      <InvitationActionModal
        open={Boolean(actionTarget)}
        invitation={actionTarget}
        action={actionType}
        submissions={submissions}
        link={actionTarget ? inviteLink(actionTarget.token) : ''}
        onClose={() => {
          if (!busyId) {
            setActionTargetId(null);
            setActionType(null);
          }
        }}
        onConfirm={handleConfirmAction}
        busy={Boolean(busyId)}
      />

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewingId(null)}
        title="Invitation Details"
        subtitle={viewing?.email}
        size="md"
        footer={
          viewing ? (
            <>
              <Button variant="outline" onClick={() => setViewingId(null)}>
                Close
              </Button>
              {viewingAction !== INVITATION_ACTION.VIEW_DETAILS && (
                <Button
                  variant="outline"
                  icon={
                    viewingAction === INVITATION_ACTION.RENEW_AND_RESEND ? RefreshCw : BellRing
                  }
                  onClick={() => handleOpenAction(viewing, viewingAction)}
                  disabled={Boolean(busyId)}
                >
                  {INVITATION_ACTION_META[viewingAction]?.label}
                </Button>
              )}
              <a
                className="btn btn--primary"
                href={inviteLink(viewing.token)}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Open link
              </a>
            </>
          ) : null
        }
      >
        {viewing && (
          <div className="invitation-view">
            <div className="invitation-view__hero">
              <div className="avatar avatar--lg">
                <Mail size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="invitation-view__email">{viewing.email}</h3>
                <p className="invitation-view__name">
                  {viewing.fullName || 'Name not provided by HR'}
                </p>
                <div className="invitation-view__badges">
                  <InvitationStatus status={viewing.status} />
                  <Badge variant={viewing.emailVerified ? 'green' : 'grey'}>
                    {viewing.emailVerified ? 'Email verified' : 'Email not verified'}
                  </Badge>
                  <Badge variant={viewingCompletion === 100 ? 'green' : 'blue'}>
                    {viewingCompletion}% complete
                  </Badge>
                </div>
              </div>
            </div>

            <div className="invitation-progress-row">
              <div className="mini-progress">
                <div className="mini-progress__track">
                  <div
                    className="mini-progress__bar"
                    style={{ width: `${viewingCompletion}%` }}
                  />
                </div>
                <span>{viewingCompletion}%</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={History}
                onClick={() => {
                  setViewingId(null);
                  setProgressId(viewing.id);
                }}
                type="button"
              >
                View profile progress
              </Button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">First Sent</div>
                <div className="detail-item__value">
                  {formatDateTime(viewing.initialSentAt || viewing.sentAt)}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Expires</div>
                <div className="detail-item__value">{formatDateTime(viewing.expiresAt)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Last Reminder</div>
                <div className="detail-item__value">
                  {viewing.lastReminderSentAt
                    ? formatDateTime(viewing.lastReminderSentAt)
                    : 'No reminders sent'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Total Reminders</div>
                <div className="detail-item__value">{viewing.reminderCount || 0}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Token Renewed</div>
                <div className="detail-item__value">
                  {viewing.tokenRenewedAt
                    ? `${formatDateTime(viewing.tokenRenewedAt)} · ${
                        viewing.tokenRenewalCount
                      } time${viewing.tokenRenewalCount === 1 ? '' : 's'}`
                    : 'Not renewed'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Completed</div>
                <div className="detail-item__value">
                  {viewing.completedAt ? formatDateTime(viewing.completedAt) : '—'}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="field">
                <label className="field__label" htmlFor="invitation-link-view">
                  Employee invitation link
                </label>
                <div className="invite-result__link-row">
                  <input
                    id="invitation-link-view"
                    className="input"
                    value={inviteLink(viewing.token)}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                  <Button
                    variant="outline"
                    icon={Copy}
                    onClick={() => handleCopy(viewing)}
                    type="button"
                  >
                    Copy
                  </Button>
                </div>
                <span className="field__hint">
                  Mock mode: this link is not emailed automatically. Share it manually for a demo.
                </span>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section__title">
                <BellRing size={16} aria-hidden="true" />
                Reminder History
              </div>
              {viewingReminders.length === 0 ? (
                <p className="cell-muted">No reminders have been sent for this invitation.</p>
              ) : (
                <ul className="reminder-history">
                  {[...viewingReminders].reverse().map((reminder) => (
                    <li key={reminder.id} className="reminder-history__item">
                      <div>
                        <div className="reminder-history__title">
                          Reminder sent · {reminder.profileCompletion}% complete
                        </div>
                        <div className="reminder-history__meta">
                          {formatDateTime(reminder.sentAt)} · Mock delivery, no real email sent
                          {reminder.renewedToken ? ' · Link renewed' : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-section__title">
                <Mail size={16} aria-hidden="true" />
                Mock Email Log
              </div>
              {viewingEmails.length === 0 ? (
                <p className="cell-muted">
                  No mock email events have been recorded for this invitation.
                </p>
              ) : (
                <ul className="reminder-history">
                  {viewingEmails.map((event) => (
                    <li key={event.id} className="reminder-history__item">
                      <div>
                        <div className="reminder-history__title">{event.subject}</div>
                        <div className="reminder-history__meta">
                          {formatDateTime(event.createdAt)} · {event.kind} · Mock delivery, no
                          real email sent
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-section__title">
                <Send size={16} aria-hidden="true" />
                Activity
              </div>
              <ul className="history-timeline invitation-activity">
                {viewingActivity.map((event) => (
                  <li className="history-timeline__item" key={`${event.label}-${event.at}`}>
                    <span className="history-timeline__marker" />
                    <div>
                      <div className="history-timeline__role">{event.label}</div>
                      <div className="history-timeline__dates">
                        {formatDateTime(event.at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="notice notice--neutral">
              <span className="notice__icon">
                <RefreshCw size={17} aria-hidden="true" />
              </span>
              <div className="notice__body">
                Profile completion is calculated from the required onboarding fields. Reminders
                are tracked separately and never mark an invitation as completed.
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
