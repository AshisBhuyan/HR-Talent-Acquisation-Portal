import { useState } from 'react';
import { CalendarPlus, RefreshCw, Search } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import InterviewTable from '../features/interviews/components/InterviewTable.jsx';
import InterviewScheduleModal from '../features/interviews/components/InterviewScheduleModal.jsx';
import InterviewFeedbackModal from '../features/interviews/components/InterviewFeedbackModal.jsx';
import InterviewInvitationModal from '../features/interviews/components/InterviewInvitationModal.jsx';
import InterviewCalendar from '../features/interviews/components/InterviewCalendar.jsx';
import useInterviews from '../features/interviews/hooks/useInterviews.js';
import { useTalentAcquisition } from '../context/TalentAcquisitionContext.jsx';
import '../styles/interviews.css';

export default function InterviewManagementPage() {
  const toast = useToast();
  const {
    upcoming,
    completed,
    cancelled,
    visibleEntries,
    counts,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    shortlistableApplications,
    loading,
    error,
    actions,
    runAction,
  } = useInterviews();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleEntry, setScheduleEntry] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('create');
  const [feedbackEntry, setFeedbackEntry] = useState(null);
  const [cancelEntry, setCancelEntry] = useState(null);
  const [inviteEntry, setInviteEntry] = useState(null);
  const [busy, setBusy] = useState(false);

  const { candidates } = useTalentAcquisition();

  const handleSchedule = async (payload, interviewId) => {
    setBusy(true);
    try {
      if (interviewId) {
        await runAction(actions.updateInterview, interviewId, payload);
        toast.success('The interview was updated.');
      } else {
        await runAction(actions.scheduleInterview, payload);
        toast.success('The interview was scheduled.');
      }
      setScheduleOpen(false);
      setScheduleEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReschedule = async (payload, interviewId) => {
    setBusy(true);
    try {
      await runAction(actions.rescheduleInterview, interviewId, payload);
      toast.success('The interview was rescheduled.');
      setScheduleOpen(false);
      setScheduleEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (interviewId) => {
    if (!inviteEntry) return;
    setBusy(true);
    try {
      const result = await runAction(actions.sendInterviewInvitation, interviewId);
      toast.success(
        `Interview invitation recorded for ${inviteEntry.candidate.fullName} (simulated email – no real mailbox was contacted).`
      );
      if (result?.mode === 'mock' && !result?.delivered) {
        // Keep the modal open so the notification history is visible.
      } else {
        setInviteEntry(null);
      }
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelEntry) return;
    setBusy(true);
    try {
      await runAction(actions.cancelInterview, cancelEntry.interview.interviewId, {
        remarks: 'Cancelled by HR',
      });
      toast.success('The interview was cancelled.');
      setCancelEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleFeedback = async (payload) => {
    if (!feedbackEntry) return;
    setBusy(true);
    try {
      await runAction(
        actions.submitFeedback,
        feedbackEntry.interview.interviewId,
        payload
      );
      toast.success('The interview feedback was recorded.');
      setFeedbackEntry(null);
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Ecometrix · Talent Acquisition"
        title="Interview Management"
        subtitle="Schedule the interview rounds of the shortlisted candidates, track their status and record the interview feedback."
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={() => window.location.reload()}>
              Refresh data
            </Button>
            <Button
              icon={CalendarPlus}
              onClick={() => {
                setScheduleEntry(null);
                setScheduleMode('create');
                setScheduleOpen(true);
              }}
            >
              Schedule Interview
            </Button>
          </>
        }
      />

      {error && (
        <div className="notice notice--error" role="alert">
          <div className="notice__body">{error}</div>
        </div>
      )}

      <div className="ta-interview-summary">
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Upcoming</span>
          <span className="ta-interview-summary__value">{upcoming.length}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Completed</span>
          <span className="ta-interview-summary__value">{completed.length}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Cancelled</span>
          <span className="ta-interview-summary__value">{cancelled.length}</span>
        </div>
        <div className="ta-interview-summary__item">
          <span className="ta-interview-summary__label">Total records</span>
          <span className="ta-interview-summary__value">{counts.all}</span>
        </div>
      </div>

      <div className="ta-dashboard-grid">
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Interview calendar</div>
              <div className="card__subtitle">Upcoming rounds grouped by day</div>
            </div>
          </div>
          <div className="card__body">
            <InterviewCalendar interviews={upcoming} candidates={candidates} />
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Interview records</div>
              <div className="card__subtitle">All scheduled, completed and cancelled rounds</div>
            </div>
          </div>
          <div className="card__body">
            <div className="page-toolbar">
              <div className="search-box">
                <span className="search-box__icon">
                  <Search size={16} aria-hidden="true" />
                </span>
                <input
                  type="search"
                  className="input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by candidate or interviewer"
                  aria-label="Search interview records"
                />
              </div>
              <div className="filters">
                <button
                  type="button"
                  className={`ta-filter-chip ${statusFilter === 'scheduled' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('scheduled')}
                >
                  Scheduled <span className="ta-filter-chip__count">{counts.scheduled}</span>
                </button>
                <button
                  type="button"
                  className={`ta-filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('completed')}
                >
                  Completed <span className="ta-filter-chip__count">{counts.completed}</span>
                </button>
                <button
                  type="button"
                  className={`ta-filter-chip ${statusFilter === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('cancelled')}
                >
                  Cancelled <span className="ta-filter-chip__count">{counts.cancelled}</span>
                </button>
                <button
                  type="button"
                  className={`ta-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All <span className="ta-filter-chip__count">{counts.all}</span>
                </button>
              </div>
            </div>

            <InterviewTable
              rows={visibleEntries}
              loading={loading}
              onEdit={(row) => {
                setScheduleEntry(row);
                setScheduleMode('edit');
                setScheduleOpen(true);
              }}
              onReschedule={(row) => {
                setScheduleEntry(row);
                setScheduleMode('reschedule');
                setScheduleOpen(true);
              }}
              onCancel={setCancelEntry}
              onFeedback={setFeedbackEntry}
              onInvite={setInviteEntry}
            />
          </div>
        </section>
      </div>

      <InterviewScheduleModal
        open={scheduleOpen}
        interview={scheduleEntry?.interview}
        mode={scheduleMode}
        candidates={shortlistableApplications}
        loading={busy}
        onClose={() => {
          setScheduleOpen(false);
          setScheduleEntry(null);
        }}
        onSubmit={
          scheduleMode === 'reschedule' ? handleReschedule : handleSchedule
        }
      />

      <InterviewInvitationModal
        open={Boolean(inviteEntry)}
        entry={inviteEntry}
        loading={busy}
        onClose={() => setInviteEntry(null)}
        onSend={handleInvite}
      />

      <InterviewFeedbackModal
        open={Boolean(feedbackEntry)}
        entry={feedbackEntry}
        loading={busy}
        onClose={() => setFeedbackEntry(null)}
        onSubmit={handleFeedback}
      />

      <ConfirmDialog
        open={Boolean(cancelEntry)}
        title="Cancel interview"
        confirmLabel="Cancel interview"
        message={
          cancelEntry
            ? `The ${cancelEntry.interview.round} round of ${cancelEntry.candidate.fullName} will be cancelled.`
            : 'The interview will be cancelled.'
        }
        onClose={() => setCancelEntry(null)}
        onConfirm={handleCancel}
        loading={busy}
      />
    </div>
  );
}
