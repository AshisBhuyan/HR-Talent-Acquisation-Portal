import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import candidateApplicationService from '../features/candidate-applications/services/candidateApplicationService.js';
import screeningService from '../features/cv-screening/services/screeningService.js';
import shortlistingService from '../features/shortlisting/services/shortlistingService.js';
import interviewService from '../features/interviews/services/interviewService.js';
import finalSelectionService from '../features/final-selection/services/finalSelectionService.js';
import approvalService from '../features/approvals/services/approvalService.js';
import offerService from '../features/offers/services/offerService.js';
import joiningService from '../features/joining-onboarding/services/joiningService.js';
import { readDatabase } from '../services/mockBackend.js';
import { APPLICATION_STATUS } from '../constants/applicationStatus.js';
import { INTERVIEW_STATUS } from '../constants/interviewStatus.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { OFFER_STATUS } from '../constants/offerStatus.js';

const TalentAcquisitionContext = createContext(null);

const EMPTY_STATE = {
  applications: [],
  candidates: [],
  jobs: [],
  screenings: [],
  shortlistings: [],
  interviews: [],
  selections: [],
  approvals: [],
  offers: [],
  joinings: [],
  activities: [],
  loading: true,
  error: '',
};

/**
 * Shared recruitment state. The context loads every collection once and
 * exposes the workflow actions that the feature services implement.
 */
export function TalentAcquisitionProvider({ children }) {
  const [state, setState] = useState(EMPTY_STATE);

  const loadAll = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setState((current) => ({ ...current, loading: true, error: '' }));
    }

    try {
      const database = readDatabase();
      setState({
        applications: database.applications,
        candidates: database.candidates,
        jobs: database.jobs,
        screenings: database.screenings,
        shortlistings: database.shortlistings,
        interviews: database.interviews,
        selections: database.selections,
        approvals: database.approvals,
        offers: database.offers,
        joinings: database.joinings,
        activities: database.activities,
        loading: false,
        error: '',
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Unable to load talent acquisition data.',
      }));
    }
  }, []);

  useEffect(() => {
    loadAll(true);
  }, [loadAll]);

  const refresh = useCallback(() => loadAll(false), [loadAll]);

  const actions = useMemo(
    () => ({
      // Applications
      moveToScreening: (applicationId, payload) =>
        candidateApplicationService.moveToScreening(applicationId, payload),
      rejectApplication: (applicationId, payload) =>
        candidateApplicationService.rejectApplication(applicationId, payload),
      holdApplication: (applicationId, payload) =>
        candidateApplicationService.putOnHold(applicationId, payload),
      resumeApplication: (applicationId, payload) =>
        candidateApplicationService.resumeApplication(applicationId, payload),
      addRemark: (applicationId, payload) =>
        candidateApplicationService.addRemark(applicationId, payload),

      // Screening
      saveScreeningDecision: (applicationId, payload) =>
        screeningService.saveScreeningDecision(applicationId, payload),
      failScreening: (applicationId, payload) =>
        screeningService.failScreening(applicationId, payload),

      // Shortlisting
      shortlistCandidate: (applicationId, payload) =>
        shortlistingService.shortlistCandidate(applicationId, payload),
      holdShortlist: (applicationId, payload) =>
        shortlistingService.putOnHold(applicationId, payload),
      rejectShortlist: (applicationId, payload) =>
        shortlistingService.rejectCandidate(applicationId, payload),

      // Interviews
      scheduleInterview: (payload) => interviewService.scheduleInterview(payload),
      updateInterview: (interviewId, payload) =>
        interviewService.updateInterview(interviewId, payload),
      rescheduleInterview: (interviewId, payload) =>
        interviewService.rescheduleInterview(interviewId, payload),
      cancelInterview: (interviewId, payload) =>
        interviewService.cancelInterview(interviewId, payload),
      submitFeedback: (interviewId, payload) =>
        interviewService.submitFeedback(interviewId, payload),
      sendInterviewInvitation: (interviewId) =>
        interviewService.sendInterviewInvitation(interviewId),

      // Final selection
      recordSelectionDecision: (applicationId, payload) =>
        finalSelectionService.recordDecision(applicationId, payload),
      submitForApproval: (applicationId, payload) =>
        finalSelectionService.submitForApproval(applicationId, payload),

      // Approvals
      decideApproval: (approvalId, payload) =>
        approvalService.decideApproval(approvalId, payload),
      resubmitApproval: (applicationId, payload) =>
        approvalService.resubmitForApproval(applicationId, payload),

      // Offers
      createOffer: (payload) => offerService.createOffer(payload),
      updateOffer: (offerId, payload) => offerService.updateOffer(offerId, payload),
      sendOffer: (offerId) => offerService.sendOffer(offerId),
      recordOfferResponse: (offerId, payload) =>
        offerService.recordOfferResponse(offerId, payload),

      // Joining
      startJoining: (offerId) => joiningService.startJoining(offerId),
      updateJoiningStatus: (joiningId, status, payload) =>
        joiningService.updateStatus(joiningId, status, payload),
      addJoiningDocument: (joiningId, payload) =>
        joiningService.addDocument(joiningId, payload),
      verifyJoiningDocument: (joiningId, documentId, payload) =>
        joiningService.verifyDocument(joiningId, documentId, payload),
      requestResubmission: (joiningId, documentId, payload) =>
        joiningService.requestResubmission(joiningId, documentId, payload),
      setJoiningChecklistItem: (joiningId, key, status, remarks) =>
        joiningService.setChecklistStatus(joiningId, key, status, remarks),
      toggleJoiningChecklist: (joiningId, key, completed) =>
        joiningService.setChecklistStatus(
          joiningId,
          key,
          completed ? 'verified' : 'pending',
          completed ? 'Marked verified.' : ''
        ),
      markJoined: (joiningId) => joiningService.markJoined(joiningId),
      prepareEmployeeHandover: (joiningId) =>
        joiningService.prepareEmployeeHandover(joiningId),
      importEmployeeToDatabank: (joiningId) =>
        joiningService.importEmployeeToDatabank(joiningId),
    }),
    []
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const upcomingInterviews = state.interviews.filter(
      (interview) =>
        interview.status === INTERVIEW_STATUS.SCHEDULED &&
        new Date(interview.scheduledAt).getTime() >= now
    );

    return {
      totalApplications: state.applications.length,
      newApplications: state.applications.filter(
        (item) => item.status === APPLICATION_STATUS.APPLIED
      ).length,
      underScreening: state.applications.filter(
        (item) => item.status === APPLICATION_STATUS.UNDER_SCREENING
      ).length,
      shortlisted: state.applications.filter(
        (item) => item.status === APPLICATION_STATUS.SHORTLISTED
      ).length,
      upcomingInterviews: upcomingInterviews.length,
      selected: state.applications.filter(
        (item) => item.status === APPLICATION_STATUS.SELECTED
      ).length,
      pendingApprovals: state.approvals.filter(
        (approval) => approval.status === APPROVAL_STATUS.PENDING
      ).length,
      offersSent: state.offers.filter((offer) => offer.status !== OFFER_STATUS.DRAFT).length,
    };
  }, [state.applications, state.interviews, state.approvals, state.offers]);

  const value = useMemo(
    () => ({ ...state, stats, actions, refresh }),
    [state, stats, actions, refresh]
  );

  return (
    <TalentAcquisitionContext.Provider value={value}>{children}</TalentAcquisitionContext.Provider>
  );
}

export { TalentAcquisitionContext };

export function useTalentAcquisition() {  const context = useContext(TalentAcquisitionContext);
  if (!context) {
    throw new Error('useTalentAcquisition must be used inside a TalentAcquisitionProvider');
  }
  return context;
}

export default TalentAcquisitionProvider;
