import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { formatSalary } from '../../../utils/formatCandidateData.js';
import { formatDate } from '../../../utils/formatDate.js';
import { buildOfferLetterPdf } from '../utils/offerLetterPdf.js';

const COMPANY_NAME = 'Ecometrix Technologies Pvt. Ltd.';
const COMPANY_ADDRESS = 'DLF Cyber City, BBSR, Odisha, India';

/**
 * Offer letter preview. The letter is rendered from the stored offer record and
 * a print-ready PDF is generated locally with the Ecometrix logo embedded.
 */
export default function OfferLetterModal({ open, entry, onClose }) {
  const [view, setView] = useState('pdf');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [generating, setGenerating] = useState(false);
  const entryRef = useRef(entry);
  entryRef.current = entry;

  useEffect(() => {
    if (!open || !entryRef.current) return undefined;

    let cancelled = false;
    let objectUrl = '';

    setGenerating(true);
    setPdfError('');
    setPdfUrl('');

    buildOfferLetterPdf(entryRef.current)
      .then(({ blob }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((error) => {
        if (cancelled) return;
        setPdfError(
          error?.message || 'The PDF preview could not be generated in this browser.'
        );
        setView('letter');
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, entry?.offer?.offerId]);

  if (!entry) return null;

  const { offer, candidate, job } = entry;
  const contact = [candidate.email, candidate.phone].filter(Boolean).join(' · ');
  const positionReference = job?.jobId || offer.jobId || 'Not specified';
  const fileName =
    offer.offerLetterName ||
    `Offer_${String(candidate.fullName || 'Candidate').replace(/\s+/g, '_')}.pdf`;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = /\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpenPdf = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Offer letter"
      subtitle={fileName}
      size="lg"
      footer={
        <>
          <span className="modal__footer-note">
            The PDF is generated in your browser with the Ecometrix logo. No real
            email is sent.
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            icon={Download}
            onClick={handleDownload}
            disabled={!pdfUrl || generating}
          >
            Download PDF
          </Button>
          <Button icon={ExternalLink} onClick={handleOpenPdf} disabled={!pdfUrl}>
            Open PDF
          </Button>
        </>
      }
    >
      <div className="ta-offer-letter__toolbar">
        <div
          className="ta-offer-letter__tabs"
          role="tablist"
          aria-label="Offer letter view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'pdf'}
            className={`ta-offer-letter__tab ${view === 'pdf' ? 'active' : ''}`}
            onClick={() => setView('pdf')}
          >
            PDF preview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'letter'}
            className={`ta-offer-letter__tab ${view === 'letter' ? 'active' : ''}`}
            onClick={() => setView('letter')}
          >
            Formatted letter
          </button>
        </div>
        <span className="cell-muted">{offer.offerId}</span>
      </div>

      {view === 'pdf' ? (
        <div className="ta-offer-letter__pdf-wrap">
          {generating && (
            <div className="ta-offer-letter__pdf-state">
              Preparing the print-ready offer letter...
            </div>
          )}
          {!generating && pdfError && (
            <div className="notice notice--error" role="alert">
              <div className="notice__body">{pdfError}</div>
            </div>
          )}
          {!generating && !pdfError && pdfUrl && (
            <iframe
              className="ta-offer-letter__pdf"
              src={`${pdfUrl}#view=FitH`}
              title={`Offer letter PDF for ${candidate.fullName}`}
            />
          )}
        </div>
      ) : (
        <article className="ta-offer-letter">
          <header className="ta-offer-letter__head">
            <div className="ta-offer-letter__identity">
              <img
                className="ta-offer-letter__logo"
                src="/assets/ecometrix-logo.png"
                alt="Ecometrix logo"
              />
              <div>
                <div className="ta-offer-letter__brand">Ecometrix</div>
                <div className="ta-offer-letter__tagline">
                  Talent Acquisition - Human Resources
                </div>
                <div className="ta-offer-letter__address">{COMPANY_ADDRESS}</div>
              </div>
            </div>
            <div className="ta-offer-letter__meta">
              <span>Offer reference</span>
              <strong>{offer.offerId}</strong>
              <span>Date</span>
              <strong>{formatDate(offer.createdAt)}</strong>
            </div>
          </header>

          <div className="ta-offer-letter__body">
            <div className="ta-offer-letter__recipient">
              <span>Prepared for</span>
              <strong>{candidate.fullName}</strong>
              {candidate.location && <div>{candidate.location}</div>}
              {contact && <div>{contact}</div>}
            </div>

            <h3 className="ta-offer-letter__title">Offer of employment</h3>
            <p className="ta-offer-letter__paragraph">
              <strong>Sub: Offer of Employment</strong>
            </p>
            <p className="ta-offer-letter__paragraph">
              Dear <strong>{candidate.fullName}</strong>,
            </p>
            <p className="ta-offer-letter__paragraph">
              We are pleased to offer you the position of{' '}
              <strong>{offer.designation}</strong> in the {offer.department}{' '}
              department at Ecometrix. This offer is based on our discussions with
              you and reflects our confidence in your experience and potential.
            </p>
            <p className="ta-offer-letter__paragraph">
              Your appointment will be governed by the terms below and by the
              policies of {COMPANY_NAME} applicable from time to time. Please read
              the details carefully. The reference for this position is{' '}
              {positionReference}.
            </p>

            <h4 className="ta-offer-letter__section">
              Appointment and compensation
            </h4>
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
                <dt>Annual compensation</dt>
                <dd>{formatSalary(offer.salaryPackage)} per annum</dd>
              </div>
              <div>
                <dt>Date of joining</dt>
                <dd>{formatDate(offer.joiningDate)}</dd>
              </div>
              <div>
                <dt>Reporting manager</dt>
                <dd>{offer.reportingManager || 'To be assigned'}</dd>
              </div>
              <div>
                <dt>Offer valid until</dt>
                <dd>
                  {offer.expiryDate ? formatDate(offer.expiryDate) : 'Not specified'}
                </dd>
              </div>
              <div>
                <dt>Position reference</dt>
                <dd>{positionReference}</dd>
              </div>
            </dl>

            {offer.additionalTerms && (
              <>
                <h4 className="ta-offer-letter__section">Additional terms</h4>
                <p className="ta-offer-letter__paragraph">
                  {offer.additionalTerms}
                </p>
              </>
            )}

            <h4 className="ta-offer-letter__section">Acceptance</h4>
            <p className="ta-offer-letter__paragraph">
              To accept this offer, please confirm your acceptance through the
              secure offer response link shared in your offer email
              {offer.expiryDate
                ? ` on or before ${formatDate(offer.expiryDate)}`
                : ''}
              . Until accepted, this offer remains subject to the terms stated
              above.
            </p>
            <p className="ta-offer-letter__paragraph">
              We look forward to welcoming you to Ecometrix and wish you a long and
              rewarding association with us.
            </p>

            <div className="ta-offer-letter__signature">
              <div>For Ecometrix Technologies Pvt. Ltd.</div>
              <div className="ta-offer-letter__signature-line" />
              <strong>HR Administrator</strong>
              <span>Authorised Signatory</span>
            </div>

            <footer className="ta-offer-letter__foot">
              <div>
                {COMPANY_NAME} | {COMPANY_ADDRESS}
              </div>
              <div>
                This offer is confidential and intended solely for{' '}
                {candidate.fullName}.
              </div>
            </footer>
          </div>
        </article>
      )}
    </Modal>
  );
}
