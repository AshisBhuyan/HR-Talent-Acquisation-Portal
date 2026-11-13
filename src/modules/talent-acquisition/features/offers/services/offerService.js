import {
  appendActivity,
  createServiceError,
  delay,
  findRecord,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';
import { APPROVAL_STATUS } from '../../../constants/approvalStatus.js';
import { APPLICATION_STATUS } from '../../../constants/applicationStatus.js';
import { OFFER_STATUS, canTransitionOffer } from '../../../constants/offerStatus.js';
import {
  transitionApplication,
  assertApplicationNotOnHold,
} from '../../candidate-applications/services/candidateApplicationService.js';
import { buildApplicationRow } from '../../../utils/formatCandidateData.js';

/**
 * Offer service. An offer can only be created for an application whose hiring
 * recommendation has been approved by the administrator.
 */
export const offerService = {
  async getOffers() {
    await delay(240);
    const database = readDatabase();

    return database.offers
      .map((offer) => {
        const application = findRecord(
          database.applications,
          (item) => item.applicationId === offer.applicationId
        );
        const candidate = findRecord(
          database.candidates,
          (item) => item.candidateId === offer.candidateId
        );
        const job = findRecord(database.jobs, (item) => item.jobId === offer.jobId);
        const approval = findRecord(
          database.approvals,
          (item) => item.applicationId === offer.applicationId
        );
        const joining = findRecord(
          database.joinings,
          (item) => item.applicationId === offer.applicationId
        );

        return {
          offer,
          approval,
          joining,
          application: application
            ? buildApplicationRow(application, { candidate, job })
            : null,
          candidate,
          job,
        };
      })
      .filter((entry) => entry.application);
  },

  async createOffer(payload = {}) {
    await delay(360);
    return mutateDatabase((database) => {
      const application = findRecord(
        database.applications,
        (item) => item.applicationId === payload.applicationId
      );
      if (!application) {
        throw createServiceError('The application record could not be found.');
      }

      assertApplicationNotOnHold(application);

      const approval = findRecord(
        database.approvals,
        (item) => item.applicationId === application.applicationId
      );
      if (!approval || approval.status !== APPROVAL_STATUS.APPROVED) {
        throw createServiceError(
          'An approved hiring recommendation is required before an offer can be created.'
        );
      }

      if (application.status !== APPLICATION_STATUS.APPROVAL) {
        throw createServiceError(
          'An offer can only be created while the application is waiting for the admin approval.'
        );
      }

      const existing = findRecord(
        database.offers,
        (item) => item.applicationId === application.applicationId
      );
      if (existing) {
        throw createServiceError('An offer already exists for this application.');
      }

      const job = findRecord(database.jobs, (item) => item.jobId === application.jobId);
      const now = new Date().toISOString();

      const record = {
        offerId: makeId('ofr'),
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        jobId: application.jobId,
        designation: payload.designation?.trim() || job?.designation || '',
        department: payload.department || job?.department || '',
        employmentType: payload.employmentType || job?.employmentType || '',
        salaryPackage: Number(payload.salaryPackage) || 0,
        joiningDate: payload.joiningDate || '',
        reportingManager: payload.reportingManager?.trim() || '',
        expiryDate: payload.expiryDate || '',
        additionalTerms: payload.additionalTerms?.trim() || '',
        status: OFFER_STATUS.DRAFT,
        createdAt: now,
        sentAt: null,
        respondedAt: null,
        offerLetterName: `Offer_${(candidateName(database, application) || 'Candidate')
          .split(' ')[0]
          .toLowerCase()}.pdf`,
      };

      database.offers.push(record);

      transitionApplication(database, application.applicationId, APPLICATION_STATUS.OFFER, {
        note: 'Offer drafted after the hiring recommendation was approved',
        at: now,
      });

      appendActivity(database, {
        type: 'offer',
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        action: 'Offer drafted',
        previousStatus: application.status,
        status: APPLICATION_STATUS.OFFER,
        note: 'Offer drafted after the hiring recommendation was approved',
        message: `Offer drafted for ${candidateName(database, application)}`,
      });

      return record;
    });
  },

  async updateOffer(offerId, payload = {}) {
    await delay(320);
    return mutateDatabase((database) => {
      const offer = findRecord(database.offers, (item) => item.offerId === offerId);
      if (!offer) {
        throw createServiceError('The offer record could not be found.');
      }
      assertOfferApplicationNotOnHold(database, offer);
      if (offer.status !== OFFER_STATUS.DRAFT) {
        throw createServiceError('Only a draft offer can be edited.');
      }

      const updated = {
        ...offer,
        designation: payload.designation?.trim() ?? offer.designation,
        department: payload.department ?? offer.department,
        employmentType: payload.employmentType ?? offer.employmentType,
        salaryPackage:
          payload.salaryPackage === undefined || payload.salaryPackage === ''
            ? offer.salaryPackage
            : Number(payload.salaryPackage),
        joiningDate: payload.joiningDate ?? offer.joiningDate,
        reportingManager: payload.reportingManager?.trim() ?? offer.reportingManager,
        expiryDate: payload.expiryDate ?? offer.expiryDate,
        additionalTerms: payload.additionalTerms?.trim() ?? offer.additionalTerms,
        updatedAt: new Date().toISOString(),
      };

      database.offers = database.offers.map((item) =>
        item.offerId === offerId ? updated : item
      );

      return updated;
    });
  },

  async sendOffer(offerId) {
    await delay(360);
    return mutateDatabase((database) => {
      const offer = findRecord(database.offers, (item) => item.offerId === offerId);
      if (!offer) {
        throw createServiceError('The offer record could not be found.');
      }
      assertOfferApplicationNotOnHold(database, offer);
      if (!canTransitionOffer(offer.status, OFFER_STATUS.SENT)) {
        throw createServiceError('Only a draft offer can be sent to the candidate.');
      }

      const now = new Date().toISOString();
      const updated = {
        ...offer,
        status: OFFER_STATUS.SENT,
        sentAt: now,
        delivery: {
          channel: 'mock-email-queue',
          confirmed: true,
          confirmedAt: now,
          note: 'Delivery recorded by the mock backend. No live email integration is connected.',
        },
      };

      database.offers = database.offers.map((item) =>
        item.offerId === offerId ? updated : item
      );

      appendActivity(database, {
        type: 'offer',
        applicationId: offer.applicationId,
        candidateId: offer.candidateId,
        action: 'Offer sent',
        status: 'sent',
        note: 'Offer letter handed over to the configured email integration',
        message: `Offer sent to ${candidateName(database, offer)}`,
      });

      return updated;
    });
  },

  async recordOfferResponse(offerId, { response, respondedAt } = {}) {
    await delay(320);
    return mutateDatabase((database) => {
      const offer = findRecord(database.offers, (item) => item.offerId === offerId);
      if (!offer) {
        throw createServiceError('The offer record could not be found.');
      }
      if (offer.status !== OFFER_STATUS.SENT) {
        throw createServiceError(
          'The offer response can only be recorded for an offer that has been sent.'
        );
      }
      if (![OFFER_STATUS.ACCEPTED, OFFER_STATUS.DECLINED].includes(response)) {
        throw createServiceError('Select a valid offer response.');
      }

      assertOfferApplicationNotOnHold(database, offer);

      const now = respondedAt || new Date().toISOString();
      const updated = {
        ...offer,
        status: response,
        respondedAt: now,
        responseSource: 'mock-candidate-response',
      };

      database.offers = database.offers.map((item) =>
        item.offerId === offerId ? updated : item
      );

      appendActivity(database, {
        type: 'offer',
        applicationId: offer.applicationId,
        candidateId: offer.candidateId,
        action: response === OFFER_STATUS.ACCEPTED ? 'Offer accepted' : 'Offer declined',
        status: response,
        note: `Candidate responded: ${response}`,
        message: `Offer ${response} by ${candidateName(database, offer)}`,
      });

      return updated;
    });
  },
};

function candidateName(database, record) {
  const candidate = findRecord(
    database.candidates,
    (item) => item.candidateId === record.candidateId
  );
  return candidate?.fullName || 'candidate';
}

function assertOfferApplicationNotOnHold(database, offer) {
  assertApplicationNotOnHold(
    findRecord(database.applications, (item) => item.applicationId === offer.applicationId)
  );
}

export default offerService;
