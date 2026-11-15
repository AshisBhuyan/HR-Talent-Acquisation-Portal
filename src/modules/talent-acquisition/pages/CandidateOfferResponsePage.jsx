import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  CircleHelp,
  FileText,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import CandidatePortalShell from '../components/CandidatePortalShell.jsx';
import { readDatabase } from '../services/mockBackend.js';
import offerService from '../features/offers/services/offerService.js';
import { formatSalary } from '../utils/formatCandidateData.js';
import { formatDate } from '../utils/formatDate.js';

function loadOfferByToken(token) {
  const database = readDatabase();
  const offer = database.offers.find((item) => item.responseToken === token) || null;
  if (!offer) return null;

  const application =
    database.applications.find((item) => item.applicationId === offer.applicationId) || null;
  const candidate =
    database.candidates.find((item) => item.candidateId === offer.candidateId) || null;
  const job = database.jobs.find((item) => item.jobId === application?.jobId) || null;

  return { offer, application, candidate, job };
}

export default function CandidateOfferResponsePage() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [confirming, setConfirming] = useState(null); // 'accepted' | 'declined'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const bundle = loadOfferByToken(token);
    if (!bundle) {
      setState({ status: 'not_found' });
      return;
    }
    if (bundle.offer.status === 'accepted') {
      setState({ status: 'already_responded', response: 'accepted', ...bundle });
      return;
    }
    if (bundle.offer.status === 'declined') {
      setState({ status: 'already_responded', response: 'declined', ...bundle });
      return;
    }
    setState({ status: 'ready', ...bundle });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (response) => {
    setBusy(true);
    setError('');
    try {
      await offerService.recordOfferResponse(state.offer.offerId, { response });
      load();
      setConfirming(null);
    } catch (actionError) {
      setError(actionError.message);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <CandidatePortalShell
        eyebrow="Ecometrix · Offer of Employment"
        title="Loading your offer"
      >
        <div className="cp-portal__card">
          <div className="loading-block">
            <span className="spinner" aria-hidden="true" />
            Resolving your personal link…
          </div>
        </div>
      </CandidatePortalShell>
    );
  }

  if (state.status === 'not_found') {
    return (
      <CandidatePortalShell
        eyebrow="Ecometrix · Offer of Employment"
        title="This link could not be verified"
      >
        <div className="cp-portal__card">
          <div className="notice notice--error" role="alert">
            <span className="notice__icon">
              <AlertCircle size={20} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Unknown or expired link</div>
              The offer link you followed is not valid. Offer links are personal to each
              candidate. If you believe this is a mistake, please contact the HR team that
              sent the offer.
            </div>
          </div>
        </div>
      </CandidatePortalShell>
    );
  }

  const { offer, candidate, job, application } = state;
  const responded = state.status === 'already_responded';

  return (
    <CandidatePortalShell
      eyebrow="Ecometrix · Offer of Employment"
      title={
        responded
          ? state.response === 'accepted'
            ? 'Offer accepted'
            : 'Offer declined'
          : `Your offer, ${candidate?.fullName || ''}`
      }
      subtitle={
        responded
          ? 'Your response has been recorded against this application.'
          : 'Please review the offer below and let us know your decision.'
      }
    >
      <div className="cp-portal__card">
        <dl className="cp-portal__summary">
          <div>
            <dt className="detail-item__label">Candidate</dt>
            <dd className="detail-item__value">{candidate?.fullName}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Application reference</dt>
            <dd className="detail-item__value">{application?.applicationId}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Position</dt>
            <dd className="detail-item__value">{offer.designation}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Department</dt>
            <dd className="detail-item__value">{offer.department}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Employment type</dt>
            <dd className="detail-item__value">{offer.employmentType || 'Full-time'}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Annual package</dt>
            <dd className="detail-item__value">{formatSalary(offer.salaryPackage)}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Proposed joining date</dt>
            <dd className="detail-item__value">{formatDate(offer.joiningDate)}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Offer expires</dt>
            <dd className="detail-item__value">{formatDate(offer.expiryDate)}</dd>
          </div>
        </dl>

        {offer.reportingManager && (
          <div className="detail-item" style={{ marginBottom: '1rem' }}>
            <div className="detail-item__label">Reporting manager</div>
            <div className="detail-item__value">{offer.reportingManager}</div>
          </div>
        )}

        {offer.additionalTerms && (
          <div className="detail-item" style={{ marginBottom: '1rem' }}>
            <div className="detail-item__label">Additional terms</div>
            <div className="detail-item__value">{offer.additionalTerms}</div>
          </div>
        )}

        <div className="detail-item" style={{ marginBottom: '1.25rem' }}>
          <div className="detail-item__label">
            <FileText size={12} aria-hidden="true" /> Offer document
          </div>
          <div className="detail-item__value">{offer.offerLetterName || 'Offer_Letter.pdf'}</div>
        </div>

        {responded ? (
          <div
            className={`notice ${state.response === 'accepted' ? 'notice--info' : 'notice--warning'}`}
            role="status"
          >
            <span className="notice__icon">
              {state.response === 'accepted' ? (
                <CheckCircle2 size={20} aria-hidden="true" />
              ) : (
                <XCircle size={20} aria-hidden="true" />
              )}
            </span>
            <div className="notice__body">
              <div className="notice__title">
                {state.response === 'accepted'
                  ? 'Thank you — your acceptance has been recorded'
                  : 'Your decline has been recorded'}
              </div>
              {state.response === 'accepted'
                ? 'A document submission request has been sent (simulated email) to your registered address. Please complete the joining formalities using the personal link in that message.'
                : 'If this was a mistake or you would like to reconsider, please contact the HR team directly.'}
            </div>
          </div>
        ) : confirming ? (
          <div className="notice notice--neutral" role="alertdialog" aria-label="Confirm your response">
            <span className="notice__icon">
              <CircleHelp size={20} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">
                {confirming === 'accepted' ? 'Confirm acceptance' : 'Confirm decline'}
              </div>
              <p style={{ margin: '0 0 0.75rem' }}>
                {confirming === 'accepted'
                  ? 'By accepting, you confirm you intend to join Ecometrix on the proposed terms. HR will be notified immediately.'
                  : 'By declining, you confirm you do not wish to join Ecometrix. This decision is recorded and the offer will be closed.'}
              </p>
              {error && <p className="field__error" role="alert">{error}</p>}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${confirming === 'accepted' ? 'btn--primary' : 'btn--danger'}`}
                  onClick={() => respond(confirming)}
                  disabled={busy}
                >
                  {busy
                    ? 'Recording…'
                    : confirming === 'accepted'
                      ? 'Yes, accept the offer'
                      : 'Yes, decline the offer'}
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setConfirming(null);
                    setError('');
                  }}
                  disabled={busy}
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="notice notice--error" role="alert">
                <span className="notice__icon">
                  <AlertCircle size={18} aria-hidden="true" />
                </span>
                <div className="notice__body">{error}</div>
              </div>
            )}
            <div className="ta-choice-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setConfirming('accepted')}
              >
                <BadgeCheck size={16} aria-hidden="true" />
                Accept offer
              </button>
              <button
                type="button"
                className="btn btn--danger-ghost"
                onClick={() => setConfirming('declined')}
              >
                <XCircle size={16} aria-hidden="true" />
                Decline offer
              </button>
            </div>
            <p className="detail-item__value detail-item__value--muted" style={{ marginTop: '0.9rem' }}>
              <ShieldAlert size={12} aria-hidden="true" /> Your response is final once recorded.
              This development link is a mock token, not production authentication.
            </p>
          </>
        )}
      </div>
    </CandidatePortalShell>
  );
}
