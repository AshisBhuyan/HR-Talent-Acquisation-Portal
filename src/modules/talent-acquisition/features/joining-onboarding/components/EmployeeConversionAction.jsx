import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  FileWarning,
  Info,
  Send,
  ShieldCheck,
} from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import { useToast } from '../../../../../shared/components/Toast.jsx';
import { getHandoverStatusMeta } from '../../../constants/joiningStatus.js';
import { buildEmployeeHandoverPayload, validateEmployeeHandover } from '../../../services/candidateToEmployeeService.js';
import { formatDate } from '../../../utils/formatDate.js';
import { formatSalary } from '../../../utils/formatCandidateData.js';

/**
 * Employee conversion review. HR can inspect the mapped record, see what is
 * missing and trigger the transfer to the existing Employee Databank through
 * its public contract. The databank is never written directly.
 */
export default function EmployeeConversionAction({
  open,
  entry,
  onClose,
  onPrepare,
  onImport,
  loading,
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => {
    if (!entry) return null;
    return buildEmployeeHandoverPayload({
      candidate: entry.candidate,
      application: entry.application,
      job: entry.job,
      offer: entry.offer,
      joining: entry.joining,
    });
  }, [entry]);

  const validation = useMemo(
    () => (payload ? validateEmployeeHandover(payload) : { valid: false, missing: ['Handover payload is not available yet.'] }),
    [payload]
  );

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  if (!entry) return null;

  const status = entry.handover?.status || 'not_ready';
  const meta = getHandoverStatusMeta(status);
  const joined = entry.joining?.status === 'joined';
  const isImported = status === 'imported';
  const isFailed = status === 'import_failed';
  const canPrepare = joined && !isImported;
  const canImport = joined && status !== 'imported' && validation.valid;

  const handover = entry.handover || {};
  const handoverHistory = Array.isArray(handover.history) ? handover.history : [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      toast.success('Handover payload copied to the clipboard.');
    } catch {
      toast.error('Clipboard access was denied.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${entry.candidate.candidateId}_${entry.application.applicationId}_handover.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    toast.success('Handover payload downloaded.');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Employee handover · ${entry.candidate.fullName}`}
      subtitle={`${entry.offer?.designation || 'Designation'} · application ${entry.application.applicationId}`}
      size="xl"
      footer={
        <>
          <span className="modal__footer-note">
            The Talent Acquisition module never writes the databank storage directly.
          </span>
          <Button variant="outline" icon={Copy} onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy handover data'}
          </Button>
          <Button variant="outline" icon={Download} onClick={handleDownload}>
            Download JSON
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canPrepare && !isImported && (
            <Button variant="secondary" icon={ShieldCheck} onClick={() => onPrepare(entry)} loading={loading}>
              Prepare handover
            </Button>
          )}
          {canImport && (
            <Button
              icon={Send}
              onClick={() => onImport(entry)}
              loading={loading}
              disabled={loading}
            >
              {isFailed ? 'Retry import' : isImported ? 'Already imported' : 'Import to Employee Databank'}
            </Button>
          )}
          {isImported && (
            <Badge variant="green" dot>
              Imported{handover.employeeId ? ` · ${handover.employeeId}` : ''}
            </Badge>
          )}
        </>
      }
    >
      <div className="ta-conversion-status">
        <div className="ta-conversion-status__item">
          <span className="ta-conversion-status__label">Employee handover status</span>
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
        </div>
        <div className="ta-conversion-status__item">
          <span className="ta-conversion-status__label">Handover reference</span>
          <span className="cell-strong">{handover.handoverId || '—'}</span>
        </div>
        <div className="ta-conversion-status__item">
          <span className="ta-conversion-status__label">Prepared on</span>
          <span>{handover.preparedAt ? formatDate(handover.preparedAt) : 'Not prepared'}</span>
        </div>
        {handover.importedAt && (
          <div className="ta-conversion-status__item">
            <span className="ta-conversion-status__label">Imported on</span>
            <span>{formatDate(handover.importedAt)}</span>
          </div>
        )}
      </div>

      {isFailed && (
        <div className="notice notice--error" role="alert" style={{ marginTop: '0.9rem' }}>
          <span className="notice__icon">
            <FileWarning size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Import failed</div>
            {handover.error || 'The Employee Databank did not confirm the record creation.'}
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => onImport(entry)}
                disabled={loading}
              >
                Retry import
              </button>
            </div>
          </div>
        </div>
      )}

      {!validation.valid && !isImported && (
        <div className="notice notice--warning" style={{ marginTop: '0.9rem' }}>
          <span className="notice__icon">
            <FileWarning size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Missing employee information</div>
            <ul>
              {validation.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section__title">Candidate information</div>
        <div className="detail-grid detail-grid--3">
          <div className="detail-item"><div className="detail-item__label">Full name</div><div className="detail-item__value">{entry.candidate.fullName}</div></div>
          <div className="detail-item"><div className="detail-item__label">Candidate ID</div><div className="detail-item__value">{entry.candidate.candidateId}</div></div>
          <div className="detail-item"><div className="detail-item__label">Application ID</div><div className="detail-item__value">{entry.application.applicationId}</div></div>
          <div className="detail-item"><div className="detail-item__label">Email</div><div className="detail-item__value">{entry.candidate.email}</div></div>
          <div className="detail-item"><div className="detail-item__label">Phone</div><div className="detail-item__value">{entry.candidate.phone || '—'}</div></div>
          <div className="detail-item"><div className="detail-item__label">Location</div><div className="detail-item__value">{entry.candidate.location || '—'}</div></div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Employment information</div>
        <div className="detail-grid detail-grid--3">
          <div className="detail-item"><div className="detail-item__label">Designation</div><div className="detail-item__value">{entry.offer?.designation || '—'}</div></div>
          <div className="detail-item"><div className="detail-item__label">Department</div><div className="detail-item__value">{entry.offer?.department || '—'}</div></div>
          <div className="detail-item"><div className="detail-item__label">Employment type</div><div className="detail-item__value">{entry.offer?.employmentType || '—'}</div></div>
          <div className="detail-item"><div className="detail-item__label">Salary package</div><div className="detail-item__value">{formatSalary(entry.offer?.salaryPackage)}</div></div>
          <div className="detail-item"><div className="detail-item__label">Reporting manager</div><div className="detail-item__value">{entry.offer?.reportingManager || 'To be assigned'}</div></div>
          <div className="detail-item"><div className="detail-item__label">Joining date</div><div className="detail-item__value">{entry.joining?.joinedAt ? formatDate(entry.joining.joinedAt) : formatDate(entry.offer?.joiningDate)}</div></div>
          <div className="detail-item"><div className="detail-item__label">Employment status</div><div className="detail-item__value"><Badge variant="green" dot>Current Employee</Badge></div></div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Education</div>
        {payload?.education?.length ? (
          <ul className="ta-detail-list">
            {payload.education.map((item, index) => (
              <li className="ta-detail-list__item" key={`${item.institution}-${index}`}>
                <div className="ta-detail-list__title">{item.qualification}</div>
                <div className="ta-detail-list__meta">
                  {item.institution}
                  {item.specialization ? ` · ${item.specialization}` : ''}
                  {item.passingYear ? ` · ${item.passingYear}` : ''}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-item__value detail-item__value--muted">No education information was captured.</p>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Experience</div>
        <div className="detail-grid detail-grid--3">
          <div className="detail-item"><div className="detail-item__label">Years of experience</div><div className="detail-item__value">{entry.candidate.totalExperienceYears ?? 'Not specified'}</div></div>
          <div className="detail-item"><div className="detail-item__label">Previous company</div><div className="detail-item__value">{entry.candidate.experience?.[0]?.company || '—'}</div></div>
          <div className="detail-item"><div className="detail-item__label">Previous designation</div><div className="detail-item__value">{entry.candidate.experience?.[0]?.designation || '—'}</div></div>
        </div>
        {entry.candidate.experience?.length > 0 && (
          <ul className="ta-detail-list" style={{ marginTop: '0.75rem' }}>
            {entry.candidate.experience.map((item, index) => (
              <li className="ta-detail-list__item" key={`${item.company}-${index}`}>
                <div className="ta-detail-list__title">{item.designation} · {item.company}</div>
                <div className="ta-detail-list__meta">{item.from} – {item.to}</div>
                {item.responsibilities && <p className="ta-detail-list__text">{item.responsibilities}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Documents</div>
        <div className="detail-grid detail-grid--3">
          <div className="detail-item">
            <div className="detail-item__label">CV reference</div>
            <div className="detail-item__value">{entry.candidate.documents?.find((doc) => doc.type === 'cv')?.fileName || 'Not received'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Verified documents</div>
            <div className="detail-item__value">{entry.documents.filter((doc) => doc.status === 'verified').length} of {entry.documents.length}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item__label">Verification status</div>
            <div className="detail-item__value">
              {entry.documents.length > 0 && entry.documents.every((doc) => ['verified', 'not_applicable'].includes(doc.status))
                ? <Badge variant="green" dot>All verified</Badge>
                : <Badge variant="orange" dot>Verification incomplete</Badge>}
            </div>
          </div>
        </div>
        <ul className="ta-detail-list" style={{ marginTop: '0.75rem' }}>
          {entry.documents.map((document) => (
            <li className="ta-detail-list__item" key={document.documentId}>
              <div className="ta-detail-list__title">{document.fileName || 'Awaiting file'}</div>
              <div className="ta-detail-list__meta">
                {document.type} · {document.status}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {handoverHistory.length > 0 && (
        <div className="detail-section">
          <div className="detail-section__title">Import history</div>
          <ol className="ta-timeline">
            {[...handoverHistory].reverse().map((item, index) => (
              <li className="ta-timeline__item" key={`${item.at}-${index}`}>
                <span className="ta-timeline__dot" aria-hidden="true" />
                <div className="ta-timeline__body">
                  <div className="ta-timeline__event">{item.action}</div>
                  <div className="ta-timeline__meta">
                    {formatDate(item.at)}
                    {item.by ? ` · ${item.by}` : ''}
                  </div>
                  {item.remarks && <div className="ta-timeline__note">{item.remarks}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="notice notice--info" style={{ marginTop: '0.75rem' }}>
        <span className="notice__icon">
          <Info size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">Integration method</div>
          The transfer uses the Employee Databank's public contract
          (<code>employeeService.createEmployee</code>). The databank decides whether to create the
          record; the handover is marked <strong>Imported</strong> only after the databank confirms.
          If it rejects the record (for example a duplicate email), the handover is marked
          <strong> Import Failed</strong> and keeps its history.
        </div>
      </div>
    </Modal>
  );
}
