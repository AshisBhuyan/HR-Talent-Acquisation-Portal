import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import { formatSalary } from '../../../utils/formatCandidateData.js';
import { formatDate } from '../../../utils/formatDate.js';

/**
 * Offer letter preview. The letter is rendered from the stored offer record.
 */
export default function OfferLetterModal({ open, entry, onClose }) {
  if (!entry) return null;

  const { offer, candidate, job } = entry;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Offer letter"
      subtitle={offer.offerLetterName || offer.offerId}
      size="lg"
      footer={
        <>
          <span className="modal__footer-note">
            The preview is generated from the stored offer record.
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="ta-offer-letter">
        <header className="ta-offer-letter__head">
          <div className="ta-offer-letter__brand">Ecometrix</div>
          <div className="ta-offer-letter__meta">
            <span>Offer reference</span>
            <strong>{offer.offerId}</strong>
          </div>
        </header>

        <h3 className="ta-offer-letter__title">Offer of employment</h3>

        <p className="ta-offer-letter__paragraph">
          Dear <strong>{candidate.fullName}</strong>,
        </p>
        <p className="ta-offer-letter__paragraph">
          Following our discussions, we are pleased to offer you the position of{' '}
          <strong>{offer.designation}</strong> in the {offer.department} department of Ecometrix.
          The reference for this position is {job?.jobId || '—'}.
        </p>

        <dl className="ta-offer-letter__grid">
          <div>
            <dt>Designation</dt>
            <dd>{offer.designation}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{offer.department}</dd>
          </div>
          <div>
            <dt>Employment type</dt>
            <dd>{offer.employmentType}</dd>
          </div>
          <div>
            <dt>Salary package</dt>
            <dd>{formatSalary(offer.salaryPackage)} per annum</dd>
          </div>
          <div>
            <dt>Joining date</dt>
            <dd>{formatDate(offer.joiningDate)}</dd>
          </div>
          <div>
            <dt>Reporting manager</dt>
            <dd>{offer.reportingManager || 'To be assigned'}</dd>
          </div>
          <div>
            <dt>Offer valid until</dt>
            <dd>{offer.expiryDate ? formatDate(offer.expiryDate) : 'Not specified'}</dd>
          </div>
          <div>
            <dt>Offer status</dt>
            <dd>
              <Badge variant="blue" dot>
                {offer.status.replace(/_/g, ' ')}
              </Badge>
            </dd>
          </div>
        </dl>

        {offer.additionalTerms && (
          <>
            <h4 className="ta-offer-letter__section">Additional terms</h4>
            <p className="ta-offer-letter__paragraph">{offer.additionalTerms}</p>
          </>
        )}

        <p className="ta-offer-letter__paragraph">
          We look forward to welcoming you to the team. Please confirm your acceptance through the
          configured offer response channel.
        </p>

        <footer className="ta-offer-letter__foot">
          <div>
            <span>For Ecometrix</span>
            <strong>HR Administrator</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{formatDate(offer.createdAt)}</strong>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
