import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Badge from '../../../shared/components/Badge.jsx';
import { ROUTES } from '../../../app/routeConfig.js';
import { useTalentAcquisition } from '../context/TalentAcquisitionContext.jsx';
import RecruitmentStats from '../components/RecruitmentStats.jsx';
import RecruitmentPipeline from '../components/RecruitmentPipeline.jsx';
import CandidateStatusBadge from '../components/CandidateStatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { RECRUITMENT_STAGES } from '../constants/recruitmentStages.js';
import { formatDate, formatDateTime, formatRelativeDay } from '../utils/formatDate.js';
import { getInitials } from '../utils/formatCandidateData.js';
import { recruitmentMetricsMockData } from '../data/recruitmentMetricsMockData.js';
import '../styles/talentAcquisition.css';

export default function TalentAcquisitionDashboard() {
  const {
    applications,
    candidates,
    jobs,
    interviews,
    activities,
    stats,
    loading,
    error,
  } = useTalentAcquisition();

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort(
          (a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime()
        )
        .slice(0, 6),
    [applications]
  );

  const upcomingInterviews = useMemo(() => {
    const now = Date.now();
    return interviews
      .filter(
        (interview) =>
          interview.status === 'scheduled' &&
          new Date(interview.scheduledAt).getTime() >= now
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
      .slice(0, 5);
  }, [interviews]);

  const stageDistribution = useMemo(
    () =>
      RECRUITMENT_STAGES.map((stage) => ({
        ...stage,
        count: applications.filter((application) => application.status === stage.key).length,
      })),
    [applications]
  );

  const maxStageCount = Math.max(...stageDistribution.map((stage) => stage.count), 1);
  const totalApplications = applications.length;

  const candidateName = (candidateId) =>
    candidates.find((candidate) => candidate.candidateId === candidateId)?.fullName ||
    'Candidate';

  const jobTitle = (jobId) => jobs.find((job) => job.jobId === jobId)?.title || 'Position';

  const recentActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 7),
    [activities]
  );

  const screenedApplications = useMemo(
    () =>
      applications.filter(
        (application) =>
          application.screeningStatus && application.screeningStatus !== 'pending'
      ).length,
    [applications]
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Ecometrix · Talent Acquisition"
        title="Recruitment Dashboard"
        subtitle="Live overview of the recruitment pipeline, the upcoming interviews and the hiring activity of the HR team."
        actions={
          <Badge variant="blue" dot>
            {recruitmentMetricsMockData.label}
          </Badge>
        }
      />

      {error && (
        <div className="notice notice--error" role="alert">
          <div className="notice__body">{error}</div>
        </div>
      )}

      <RecruitmentStats stats={stats} />

      <RecruitmentPipeline applications={applications} />

      <div className="ta-dashboard-grid">
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Recent applications</div>
              <div className="card__subtitle">Latest applications received from the Career Portal</div>
            </div>
            <Link className="btn btn--ghost btn--sm" to={ROUTES.TALENT_APPLICATIONS}>
              View all
            </Link>
          </div>
          <div className="card__body">
            {loading ? (
              <div className="loading-block">
                <span className="spinner" aria-hidden="true" />
                Loading applications…
              </div>
            ) : recentApplications.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No applications yet"
                description="Applications submitted through the Career Portal appear here."
              />
            ) : (
              <ul className="ta-list">
                {recentApplications.map((application) => (
                  <li className="ta-list__item" key={application.applicationId}>
                    <div className="avatar avatar--sm">{getInitials(candidateName(application.candidateId))}</div>
                    <div className="ta-list__body">
                      <div className="ta-list__title">{candidateName(application.candidateId)}</div>
                      <div className="ta-list__meta">
                        {jobTitle(application.jobId)} · {formatDate(application.appliedDate)}
                      </div>
                    </div>
                    <CandidateStatusBadge status={application.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Upcoming interviews</div>
              <div className="card__subtitle">Scheduled rounds in the coming days</div>
            </div>
            <CalendarClock size={18} aria-hidden="true" />
          </div>
          <div className="card__body">
            {loading ? (
              <div className="loading-block">
                <span className="spinner" aria-hidden="true" />
                Loading interviews…
              </div>
            ) : upcomingInterviews.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No interviews scheduled"
                description="Schedule an interview from the interview management page."
              />
            ) : (
              <ul className="ta-list">
                {upcomingInterviews.map((interview) => (
                  <li className="ta-list__item" key={interview.interviewId}>
                    <div className="ta-list__body">
                      <div className="ta-list__title">
                        {candidateName(interview.candidateId)} · {interview.round} round
                      </div>
                      <div className="ta-list__meta">
                        {formatDateTime(interview.scheduledAt)} · {interview.interviewer}
                      </div>
                    </div>
                    <Badge variant="blue">{formatRelativeDay(interview.scheduledAt)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="ta-dashboard-grid">
        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Recruitment stage distribution</div>
              <div className="card__subtitle">
                {totalApplications} applications across the recruitment stages
              </div>
            </div>
            <TrendingUp size={18} aria-hidden="true" />
          </div>
          <div className="card__body">
            <ul className="ta-bar-list">
              {stageDistribution.map((stage) => (
                <li className="ta-bar-list__item" key={stage.key}>
                  <div className="ta-bar-list__head">
                    <span className="ta-bar-list__label">{stage.label}</span>
                    <span className="ta-bar-list__value">
                      {stage.count}
                      <span className="ta-bar-list__share">
                        {totalApplications
                          ? `${Math.round((stage.count / totalApplications) * 100)}%`
                          : '0%'}
                      </span>
                    </span>
                  </div>
                  <div className="ta-bar-list__track" aria-hidden="true">
                    <span
                      className="ta-bar-list__bar"
                      style={{ width: `${Math.round((stage.count / maxStageCount) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Recent recruitment activity</div>
              <div className="card__subtitle">Workflow events recorded by the HR team</div>
            </div>
            <Activity size={18} aria-hidden="true" />
          </div>
          <div className="card__body">
            {recentActivities.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity recorded"
                description="Workflow events will appear here as the recruitment progresses."
              />
            ) : (
              <ul className="ta-activity">
                {recentActivities.map((activity) => (
                  <li className="ta-activity__item" key={activity.id}>
                    <span className={`ta-activity__dot ta-activity__dot--${activity.type}`} aria-hidden="true" />
                    <div className="ta-activity__body">
                      <div className="ta-activity__message">{activity.message}</div>
                      <div className="ta-activity__meta">{formatDateTime(activity.at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Hiring summary</div>
            <div className="card__subtitle">
              {recruitmentMetricsMockData.note}
            </div>
          </div>
          <Gauge size={18} aria-hidden="true" />
        </div>
        <div className="card__body">
          <div className="ta-summary-grid">
            <div className="ta-summary__item">
              <div className="ta-summary__label">Applications received</div>
              <div className="ta-summary__value">{stats.totalApplications}</div>
            </div>
            <div className="ta-summary__item">
              <div className="ta-summary__label">Screening completed</div>
              <div className="ta-summary__value">{screenedApplications}</div>
            </div>
            <div className="ta-summary__item">
              <div className="ta-summary__label">Shortlisted</div>
              <div className="ta-summary__value">{stats.shortlisted}</div>
            </div>
            <div className="ta-summary__item">
              <div className="ta-summary__label">Offers sent</div>
              <div className="ta-summary__value">{stats.offersSent}</div>
            </div>
            <div className="ta-summary__item">
              <div className="ta-summary__label">Selected candidates</div>
              <div className="ta-summary__value">{stats.selected}</div>
            </div>
            <div className="ta-summary__item">
              <div className="ta-summary__label">Average time to shortlist</div>
              <div className="ta-summary__value">
                {recruitmentMetricsMockData.hiringSummary.averageTimeToShortlistDays} days
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
