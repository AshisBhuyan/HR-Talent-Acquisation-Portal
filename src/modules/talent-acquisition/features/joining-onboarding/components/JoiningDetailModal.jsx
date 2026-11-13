import { UserRound } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import DocumentVerification from './DocumentVerification.jsx';
import JoiningChecklist from './JoiningChecklist.jsx';
import { getJoiningStatusMeta, HANDOVER_STATUS, getHandoverStatusMeta } from '../../../constants/joiningStatus.js';
import { getOfferStatusMeta } from '../../../constants/offerStatus.js';
import { formatDate } from '../../../utils/formatDate.js';

/**
 * Joining details screen: candidate/offer summary, documents, checklist and
 * the workflow actions for one joining record.
 */
export default function JoiningDetailModal({
  open,
  entry,
  loading,
  onClose,
  onAddDocument,
  onVerify,
  onReject,
  onSetChecklistStatus,
  onUpdateStatus,
  onMarkJoined,
  onOpenConversion,
  onPreview,
  onDownload,
}) {
  if (!entry) return null;

  const { joining, candidate, offer, documents, checklist, application, job } = entry;
  const statusMeta = getJoiningStatusMeta(joining.status);
  const offerMeta = offer ? getOfferStatusMeta(offer.status) : null;
  const handoverMeta = getHandoverStatusMeta(entry.handoverStatus);

  const joined = joining.status === 'joined';
  const checklistSatisfied = checklist.every((item) => {
    if (!item.mandatory) return true;
    return item.status === 'verified' || item.status === 'not_applicable';
  });
  const documentsComplete = documents.length === 0
    ? false
    : documents.every((document) =>
        ['verified', 'not_applicable'].includes(document.status)
      );
  const canMarkJoined = joined === false && offer?.status === 'accepted' && (
    documents.length > 0 ? documentsComplete : false
  ) && checklistSatisfied;

  const blockingReasons = [];
  if (offer?.status !== 'accepted') blockingReasons.push('The offer has not been accepted.');
  if (!checklistSatisfied) blockingReasons.push('Mandatory checklist items are not verified.');
  if (documents.length === 0) blockingReasons.push('No documents have been submitted yet.');
  else if (!documentsComplete) blockingReasons.push('Some documents are not verified yet.');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Joining · ${candidate.fullName}`}
      subtitle={`${offer?.designation || 'Designation'} · application ${application.applicationId} · ${joining.joiningId}`}
      size="xl"
      footer={
        <>
          <span className="modal__footer-note">
            The Employee Databank keeps its own onboarding flow; documents stay in the joining portal.
          </span>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Close
          </Button>
          {!joined && (
            <Button
              icon={UserRound}
              onClick={() => onMarkJoined(entry)}
              loading={loading}
              disabled={loading}
            >
              Mark as joined
            </Button>
          )}
          {joined && (
            <Button
              variant="secondary"
              icon={UserRound}
              onClick={() => onOpenConversion(entry)}
              disabled={loading}
            >
              Employee handover
            </Button>
          )}
        </>
      }
    >
      <div className="detail-grid detail-grid--3">
        <div className="detail-item">
          <div className="detail-item__label">Candidate</div>
          <div className="detail-item__value">{candidate.fullName}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Candidate ID</div>
          <div className="detail-item__value">{candidate.candidateId}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Application ID</div>
          <div className="detail-item__value">{application.applicationId}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Email</div>
          <div className="detail-item__value">{candidate.email}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Phone</div>
          <div className="detail-item__value">{candidate.phone || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Designation</div>
          <div className="detail-item__value">{offer?.designation || job?.designation || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Department</div>
          <div className="detail-item__value">{offer?.department || job?.department || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Joining date</div>
          <div className="detail-item__value">{formatDate(joining.joiningDate)}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Offer status</div>
          <div className="detail-item__value">
            {offerMeta ? (
              <Badge variant={offerMeta.variant} dot>
                {offerMeta.label}
              </Badge>
            ) : '—'}
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Joining status</div>
          <div className="detail-item__value">
            <Badge variant={statusMeta.variant} dot>
              {statusMeta.label}
            </Badge>
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Documents verified</div>
          <div className="detail-item__value">{entry.documentsVerified} of {entry.documentsTotal}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item__label">Handover status</div>
          <div className="detail-item__value">
            <Badge variant={handoverMeta.variant} dot>
              {handoverMeta.label}
            </Badge>
          </div>
        </div>
      </div>

      {!joined && blockingReasons.length > 0 && (
        <div className="notice notice--warning" style={{ marginTop: '0.9rem' }}>
          <div className="notice__body">
            <div className="notice__title">Cannot be marked as joined yet</div>
            <ul>
              {blockingReasons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a href="#joining-documents" className="btn btn--outline btn--sm">
                Go to documents
              </a>
              <a href="#joining-checklist" className="btn btn--outline btn--sm">
                Go to checklist
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="detail-section" id="joining-documents">
        <div className="detail-section__title">Documents and verification</div>
        <DocumentVerification
          entry={entry}
          loading={loading}
          onPreview={onPreview}
          onDownload={onDownload}
          onVerify={onVerify}
          onReject={onReject}
        />
        <div className="ta-inline-form" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => onAddDocument(entry)}
          >
            Record submitted document
          </button>
        </div>
      </div>

      <div className="detail-section" id="joining-checklist">
        <div className="detail-section__title">Joining checklist</div>
        <JoiningChecklist entry={entry} loading={loading} onSetStatus={onSetChecklistStatus} />
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Progress and actions</div>
        <div className="ta-choice-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateStatus(entry, 'documents_pending')}
            disabled={loading}
          >
            Documents pending
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateStatus(entry, 'verification_in_progress')}
            disabled={loading}
          >
            Verification in progress
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateStatus(entry, 'ready_to_join')}
            disabled={loading || !checklistSatisfied}
          >
            Ready to join
          </Button>
        </div>
        <p className="detail-item__value detail-item__value--muted" style={{ marginTop: '0.7rem' }}>
          Use the document and checklist statuses above — the joining status updates automatically
          as mandatory items are verified.
        </p>
      </div>
    </Modal>
  );
}
