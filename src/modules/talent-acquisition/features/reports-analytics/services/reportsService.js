import { delay, readDatabase } from '../../../services/mockBackend.js';
import { RECRUITMENT_STAGES } from '../../../constants/recruitmentStages.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import { SCREENING_STATUS } from '../../../constants/screeningStatus.js';
import { INTERVIEW_STATUS } from '../../../constants/interviewStatus.js';
import { SELECTION_STATUS } from '../../../constants/selectionStatus.js';
import { APPROVAL_STATUS } from '../../../constants/approvalStatus.js';
import { OFFER_STATUS } from '../../../constants/offerStatus.js';
import { JOINING_STATUS } from '../../../constants/joiningStatus.js';
import { isWithinDateRange } from '../../../utils/candidateFilters.js';

/**
 * Recruitment reporting service. Every figure is calculated from the stored
 * Talent Acquisition records, so the reports can never drift away from the
 * operational data.
 */

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function filterByScope(rows, filters = {}) {
  const { dateFrom = '', dateTo = '', jobId = '', stage = '' } = filters;

  return rows.filter((row) => {
    if (jobId && row.jobId !== jobId) return false;
    if (stage && row.status !== stage) return false;
    if (dateFrom || dateTo) {
      const applied = row.appliedDate || row.scheduledAt || row.createdAt;
      if (!isWithinDateRange(applied, dateFrom, dateTo)) return false;
    }
    return true;
  });
}

export const reportsService = {
  async getReports(filters = {}) {
    await delay(280);
    const database = readDatabase();

    const applications = filterByScope(database.applications, filters);
    const applicationIds = new Set(applications.map((item) => item.applicationId));

    const scoped = (collection) =>
      collection.filter((item) => applicationIds.has(item.applicationId));

    const screenings = scoped(database.screenings);
    const shortlistings = scoped(database.shortlistings);
    const interviews = scoped(database.interviews);
    const selections = scoped(database.selections);
    const approvals = scoped(database.approvals);
    const offers = scoped(database.offers);
    const joinings = scoped(database.joinings);

    const totalApplications = applications.length;
    const newApplications = applications.filter(
      (item) => item.status === APPLICATION_STATUS.APPLIED
    ).length;
    const underScreening = applications.filter(
      (item) => item.status === APPLICATION_STATUS.UNDER_SCREENING
    ).length;
    const shortlisted = applications.filter(
      (item) => item.status === APPLICATION_STATUS.SHORTLISTED
    ).length;
    const selected = applications.filter(
      (item) => item.status === APPLICATION_STATUS.SELECTED
    ).length;
    const rejected = applications.filter(
      (item) => item.status === APPLICATION_STATUS.REJECTED
    ).length;

    const now = Date.now();
    const upcomingInterviews = interviews.filter(
      (item) =>
        item.status === INTERVIEW_STATUS.SCHEDULED &&
        new Date(item.scheduledAt).getTime() >= now
    );

    const stageDistribution = RECRUITMENT_STAGES.map((stage) => ({
      key: stage.key,
      label: stage.label,
      count: applications.filter((item) => item.status === stage.key).length,
      percentage: percentage(
        applications.filter((item) => item.status === stage.key).length,
        totalApplications
      ),
    }));

    const byPosition = Object.values(
      database.jobs.reduce((accumulator, job) => {
        const scopedApplications = applications.filter((item) => item.jobId === job.jobId);
        accumulator[job.jobId] = {
          jobId: job.jobId,
          title: job.title,
          department: job.department,
          openings: job.openings,
          applications: scopedApplications.length,
          shortlisted: scopedApplications.filter(
            (item) =>
              [
                APPLICATION_STATUS.SHORTLISTED,
                APPLICATION_STATUS.INTERVIEW,
                APPLICATION_STATUS.FINAL_SELECTION,
                APPLICATION_STATUS.APPROVAL,
                APPLICATION_STATUS.OFFER,
                APPLICATION_STATUS.JOINING,
                APPLICATION_STATUS.SELECTED,
              ].includes(item.status)
          ).length,
          selected: scopedApplications.filter(
            (item) => item.status === APPLICATION_STATUS.SELECTED
          ).length,
        };
        return accumulator;
      }, {})
    ).sort((a, b) => b.applications - a.applications);

    const scoredScreenings = screenings.filter(
      (item) => Number.isFinite(Number(item.score))
    );
    const averageScore = scoredScreenings.length
      ? Math.round(
          scoredScreenings.reduce((total, item) => total + Number(item.score), 0) /
            scoredScreenings.length
        )
      : 0;

    const screeningStats = {
      total: screenings.length,
      pending: screenings.filter((item) => item.status === SCREENING_STATUS.PENDING).length,
      inProgress: screenings.filter((item) => item.status === SCREENING_STATUS.IN_PROGRESS)
        .length,
      passed: screenings.filter((item) => item.status === SCREENING_STATUS.PASSED).length,
      failed: screenings.filter((item) => item.status === SCREENING_STATUS.FAILED).length,
      averageScore,
      passRate: percentage(
        screenings.filter((item) => item.status === SCREENING_STATUS.PASSED).length,
        screenings.length
      ),
    };

    const shortlistingStats = {
      total: shortlistings.length,
      shortlisted: shortlistings.filter((item) => item.status === 'shortlisted').length,
      onHold: shortlistings.filter((item) => item.status === 'on_hold').length,
      rejected: shortlistings.filter((item) => item.status === 'rejected').length,
      shortlistRate: percentage(
        shortlistings.filter((item) => item.status === 'shortlisted').length,
        shortlistings.length
      ),
    };

    const completedInterviews = interviews.filter(
      (item) => item.status === INTERVIEW_STATUS.COMPLETED
    );
    const ratedInterviews = completedInterviews.filter(
      (item) => Number.isFinite(Number(item.feedback?.overallRating))
    );
    const averageRating = ratedInterviews.length
      ? (
          ratedInterviews.reduce(
            (total, item) => total + Number(item.feedback.overallRating),
            0
          ) / ratedInterviews.length
        ).toFixed(1)
      : '0.0';

    const interviewStats = {
      total: interviews.length,
      scheduled: interviews.filter((item) => item.status === INTERVIEW_STATUS.SCHEDULED)
        .length,
      completed: completedInterviews.length,
      rescheduled: interviews.filter((item) => item.status === INTERVIEW_STATUS.RESCHEDULED)
        .length,
      cancelled: interviews.filter((item) => item.status === INTERVIEW_STATUS.CANCELLED)
        .length,
      averageRating,
      recommended: completedInterviews.filter(
        (item) => item.feedback?.recommendation === 'recommended'
      ).length,
    };

    const selectionStats = {
      total: selections.length,
      selected: selections.filter((item) => item.decision === SELECTION_STATUS.SELECTED).length,
      rejected: selections.filter((item) => item.decision === SELECTION_STATUS.REJECTED).length,
      onHold: selections.filter((item) => item.decision === SELECTION_STATUS.ON_HOLD).length,
      submitted: selections.filter((item) => item.submittedForApproval).length,
    };

    const approvalStats = {
      total: approvals.length,
      pending: approvals.filter((item) => item.status === APPROVAL_STATUS.PENDING).length,
      approved: approvals.filter((item) => item.status === APPROVAL_STATUS.APPROVED).length,
      rejected: approvals.filter((item) => item.status === APPROVAL_STATUS.REJECTED).length,
      clarification: approvals.filter(
        (item) => item.status === APPROVAL_STATUS.CLARIFICATION_REQUESTED
      ).length,
      approvalRate: percentage(
        approvals.filter((item) => item.status === APPROVAL_STATUS.APPROVED).length,
        approvals.length
      ),
    };

    const sentOffers = offers.filter((item) => item.status !== OFFER_STATUS.DRAFT);
    const acceptedOffers = offers.filter((item) => item.status === OFFER_STATUS.ACCEPTED);

    const offerStats = {
      total: offers.length,
      draft: offers.filter((item) => item.status === OFFER_STATUS.DRAFT).length,
      sent: offers.filter((item) => item.status === OFFER_STATUS.SENT).length,
      accepted: acceptedOffers.length,
      declined: offers.filter((item) => item.status === OFFER_STATUS.DECLINED).length,
      acceptanceRate: percentage(acceptedOffers.length, sentOffers.length),
      averagePackage: acceptedOffers.length
        ? Math.round(
            acceptedOffers.reduce((total, item) => total + Number(item.salaryPackage || 0), 0) /
              acceptedOffers.length
          )
        : 0,
    };

    const joiningStats = {
      total: joinings.length,
      pending: joinings.filter((item) => item.status === JOINING_STATUS.PENDING).length,
      documentsPending: joinings.filter(
        (item) => item.status === JOINING_STATUS.DOCUMENTS_PENDING
      ).length,
      verification: joinings.filter(
        (item) => item.status === JOINING_STATUS.VERIFICATION_IN_PROGRESS
      ).length,
      readyToJoin: joinings.filter((item) => item.status === JOINING_STATUS.READY_TO_JOIN)
        .length,
      joined: joinings.filter((item) => item.status === JOINING_STATUS.JOINED).length,
      handedOver: joinings.filter((item) => item.conversion?.status === 'handed_over').length,
    };

    return {
      filters,
      generatedAt: new Date().toISOString(),
      summary: {
        totalApplications,
        newApplications,
        underScreening,
        shortlisted,
        upcomingInterviews: upcomingInterviews.length,
        selected,
        pendingApprovals: approvalStats.pending,
        offersSent: sentOffers.length,
        rejected,
      },
      stageDistribution,
      byPosition,
      screeningStats,
      shortlistingStats,
      interviewStats,
      selectionStats,
      approvalStats,
      offerStats,
      joiningStats,
    };
  },
};

export default reportsService;
