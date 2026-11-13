import {
  CalendarPlus,
  ClipboardCheck,
  FileSearch,
  MessageSquarePlus,
  MoveRight,
  PauseCircle,
  PlayCircle,
  UserRound,
  XCircle,
} from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import CandidateStatusBadge from '../../../components/CandidateStatusBadge.jsx';
import { formatDate, formatDateTime } from '../../../utils/formatDate.js';
import { formatExperienceYears } from '../../../utils/formatCandidateData.js';
import {
  APPLICATION_STATUS,
  canTransitionApplication,
} from '../../../constants/applicationStatus.js';

/**
 * Shows the application record of a candidate: the applied position, the
 * application details, the HR remarks and the recruitment timeline.
 */
export default function ApplicationDetailModal({
  row,
  open,
  onClose,
  onMoveToScreening,
  onViewScreening,
  onScheduleInterview,
  onHold,
  onResume,
  onAddRemark,
  onReject,
  onPreviewCv,
  onOpenProfile,
}) {
  if (!row) return null;

  const timeline = Array.isArray(row.timeline) ? [...row.timeline].reverse() : [];
  const isApplied = row.status === APPLICATION_STATUS.APPLIED;
  const isUnderScreening = row.status === APPLICATION_STATUS.UNDER_SCREENING;
  const isShortlisted = row.status === APPLICATION_STATUS.SHORTLISTED;
  const isOnHold = row.status === APPLICATION_STATUS.ON_HOLD;
  const canHold = canTransitionApplication(row.status, APPLICATION_STATUS.ON_HOLD);
  const canReject = canTransitionApplication(row.status, APPLICATION_STATUS.REJECTED);
  const active = ![APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.SELECTED].includes(
    row.status
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row.candidateName}
      subtitle={`${row.jobTitle} · ${row.applicationId}`}
      size="lg"
      footer={
        <>
          <span className="modal__footer-note">Application received via {row.source}</span>
          <Button variant="outline" icon={FileSearch} onClick={() => onPreviewCv(row)}>
            Preview CV
          </Button>
          <Button variant="outline" icon={UserRound} onClick={() => onOpenProfile(row)}>
            Open Profile
          </Button>
          {isApplied && (
            <Button icon={MoveRight} onClick={() => onMoveToScreening(row)}>
              Move to Screening
            </Button>
          )}
          {isUnderScreening && (
            <Button variant="outline" icon={ClipboardCheck} onClick={() => onViewScreening(row)}>
              View Screening
            </Button>
          )}
          {isShortlisted && (
            <Button variant="outline" icon={CalendarPlus} onClick={() => onScheduleInterview(row)}>
              Schedule Interview
            </Button>
          )}
          {active && (
            <Button variant="ghost" icon={MessageSquarePlus} onClick={() => onAddRemark(row)}>
              Add Remark
            </Button>
          )}
          {canHold && (
            <Button variant="outline" icon={PauseCircle} onClick={() => onHold(row)}>
              Put on Hold
            </Button>
          )}
          {isOnHold && (
            <Button variant="outline" icon={PlayCircle} onClick={() => onResume(row)}>
              Resume
            </Button>
          )}
          {canReject && (
            <Button variant="danger-ghost" icon={XCircle} onClick={() => onReject(row)}>
              Reject
            </Button>
          )}
        </>
      }
    >
      <div className="detail-grid detail-grid--3">
        <div className="detail-item">
          <div className="detail-item__label">Application ID</div>
          <div className="detail-item__value">{row.applicationId}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Candidate ID</div>
          <div className="detail-item__value">{row.candidateId}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Status</div>
          <div className="detail-item__value">
            <CandidateStatusBadge status={row.status} />
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Email</div>
          <div className="detail-item__value">{row.candidateEmail || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Phone</div>
          <div className="detail-item__value">{row.candidatePhone || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Location</div>
          <div className="detail-item__value">{row.candidateLocation || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Position</div>
          <div className="detail-item__value">{row.jobTitle}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Department</div>
          <div className="detail-item__value">{row.jobDepartment || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Experience</div>
          <div className="detail-item__value">
            {formatExperienceYears(row.candidateExperienceYears)}
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Applied date</div>
          <div className="detail-item__value">{formatDate(row.appliedDate)}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">CV attached</div>
          <div className="detail-item__value">
            {row.candidateHasCv ? 'CV received' : 'Not received'}
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Source</div>
          <div className="detail-item__value">{row.source}</div>
        </div>
      </div>



      {row.status === APPLICATION_STATUS.ON_HOLD && (
        <div className="notice notice--warning">
          <div className="notice__body">
            <div className="notice__title">Application on hold</div>
            {row.holdReason || 'This application is on hold. Resume it before moving the candidate forward.'}
            {row.heldAt && (
              <>
                {' '}
                Placed on hold on {formatDate(row.heldAt)}
                {row.heldBy ? ` by ${row.heldBy}` : ''}.
              </>
            )}
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section__title">Latest HR remark</div>
        {row.remarks ? (
          <p className="detail-item__value">{row.remarks}</p>
        ) : (
          <p className="detail-item__value detail-item__value--muted">
            No remarks recorded yet.
          </p>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Recruitment timeline</div>
        {timeline.length === 0 ? (
          <p className="detail-item__value detail-item__value--muted">
            No timeline entries recorded yet.
          </p>
        ) : (
          <ol className="ta-timeline">
            {timeline.map((entry, index) => (
              <li className="ta-timeline__item" key={`${entry.at}-${index}`}>
                <span className="ta-timeline__dot" aria-hidden="true" />
                <div className="ta-timeline__body">
                  <div className="ta-timeline__event">
                    {entry.event}
                    {entry.previousStatus && entry.status ? (
                      <span className="ta-timeline__transition">
                        {' '}
                        {entry.previousStatus.replace(/_/g, ' ')} → {entry.status.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                  </div>
                  <div className="ta-timeline__meta">
                    {formatDateTime(entry.at)}
                    {entry.user ? ` · ${entry.user}` : ''}
                  </div>
                  {entry.note && <div className="ta-timeline__note">{entry.note}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
