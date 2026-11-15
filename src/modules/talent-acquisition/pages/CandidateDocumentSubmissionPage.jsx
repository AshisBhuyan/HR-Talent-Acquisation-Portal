import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import CandidatePortalShell from '../components/CandidatePortalShell.jsx';
import Badge from '../../../shared/components/Badge.jsx';
import documentRequestService from '../features/document-requests/services/documentRequestService.js';
import {
  UPLOAD_ACCEPT,
  UPLOAD_MAX_LABEL,
  validateUploadFile,
  DOCUMENT_REQUEST_STATUS,
} from '../constants/documentRequestRules.js';
import { getDocumentStatusMeta } from '../constants/joiningStatus.js';
import { makeStorageKey, putBlob, getBlob, deleteBlob } from '../services/documentStorage.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';
import { formatFileSize } from '../constants/candidateDocumentRules.js';

export default function CandidateDocumentSubmissionPage() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const fileInputs = useRef({});

  const load = useCallback(async () => {
    const bundle = await documentRequestService.getPortalState(token);
    if (!bundle) {
      setState({ status: 'not_found' });
      return;
    }
    // Rehydrate the terminal state from persistence: a request that has
    // already been submitted shows the confirmation, not the upload form.
    if (bundle.request?.status === DOCUMENT_REQUEST_STATUS.SUBMITTED) {
      const documentsOnFile = (bundle.joining?.documents || []).filter(
        (document) => document?.isCurrent !== false
      ).length;
      setState({
        status: 'submitted',
        ...bundle,
        result: {
          requestId: bundle.request.requestId,
          submittedAt: bundle.request.submittedAt,
          documentsSubmitted: documentsOnFile,
          requestStatus: bundle.request.status,
        },
      });
      return;
    }
    setState({ status: 'ready', ...bundle });
  }, [token]);

  useEffect(() => {
    let active = true;
    load().catch(() => {
      if (active) setState({ status: 'error' });
    });
    return () => {
      active = false;
    };
  }, [load]);

  const stagedCount = state.states
    ? Object.keys(state.request?.stagedDocuments || {}).length
    : 0;

  const updateError = (type, list) =>
    setErrors((current) => ({ ...current, [type]: list }));

  const handleFileSelect = async (requirement, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      updateError(requirement.type, validation.errors);
      return;
    }
    updateError(requirement.type, null);

    try {
      const storageKey = makeStorageKey([state.request.requestId, requirement.type, 'staged']);
      await putBlob(storageKey, file);
      await documentRequestService.stageDocument(token, {
        type: requirement.type,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        storageKey,
      });
      await load();
    } catch (uploadError) {
      updateError(requirement.type, [
        uploadError.message || 'The file could not be staged. Please try again.',
      ]);
    }
  };

  const handleRemoveStaged = async (requirement) => {
    setBusy(true);
    try {
      const removed = await documentRequestService.unstageDocument(token, requirement.type);
      if (removed?.storageKey) {
        await deleteBlob(removed.storageKey).catch(() => {});
      }
      await load();
    } catch (removeError) {
      setMessage({ tone: 'error', text: removeError.message });
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewStaged = async (requirement) => {
    const staged = state.request?.stagedDocuments?.[requirement.type];
    if (!staged?.storageKey) return;
    const blob = await getBlob(staged.storageKey);
    if (!blob) {
      setMessage({ tone: 'error', text: 'The staged file could not be read from this browser.' });
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await documentRequestService.submitDocuments(token, {
        user: 'Candidate',
      });
      if (result.requestStatus === DOCUMENT_REQUEST_STATUS.SUBMITTED) {
        // Merge the previous persisted state first, then force the terminal
        // status so the submission confirmation is shown.
        setState((current) => ({ ...current, status: 'submitted', result }));
      } else {
        // Partial submission: the mandatory documents are not all in yet.
        // Stay in the upload view and refresh it instead of claiming that
        // everything was received.
        await load();
        setMessage({
          tone: 'info',
          text: `${result.documentsSubmitted} document(s) recorded. Some mandatory documents are still outstanding — you can upload them here.`,
        });
      }
    } catch (submitError) {
      setMessage({ tone: 'error', text: submitError.message });
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <CandidatePortalShell eyebrow="Ecometrix · Joining Formalities" title="Loading your documents">
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
        eyebrow="Ecometrix · Joining Formalities"
        title="This link could not be verified"
      >
        <div className="cp-portal__card">
          <div className="notice notice--error" role="alert">
            <span className="notice__icon">
              <AlertCircle size={20} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Unknown or expired link</div>
              The document submission link you followed is not valid. Links are personal to the
              intended candidate. Please use the link from your own email or contact HR.
            </div>
          </div>
        </div>
      </CandidatePortalShell>
    );
  }

  if (state.status === 'error') {
    return (
      <CandidatePortalShell
        eyebrow="Ecometrix · Joining Formalities"
        title="This link could not be loaded"
      >
        <div className="cp-portal__card">
          <div className="notice notice--error" role="alert">
            <span className="notice__icon">
              <AlertCircle size={20} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Something went wrong</div>
              The document request could not be read. Check your connection and try again.
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn--outline" onClick={() => load()}>
              Try again
            </button>
          </div>
        </div>
      </CandidatePortalShell>
    );
  }

  if (state.status === 'submitted') {
    return (
      <CandidatePortalShell
        eyebrow="Ecometrix · Joining Formalities"
        title="Documents received"
        subtitle="Thank you — HR will verify your documents and contact you if anything is needed."
      >
        <div className="cp-portal__card">
          <div className="notice notice--info" role="status">
            <span className="notice__icon">
              <CheckCircle2 size={22} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Submission recorded</div>
              {state.result?.documentsSubmitted} document(s) were submitted on{' '}
              {formatDateTime(state.result?.submittedAt)}. Reference:{' '}
              <strong>{state.result?.requestId}</strong>. If HR requests a replacement, you will
              receive a new link in your email (simulated).
            </div>
          </div>
        </div>
      </CandidatePortalShell>
    );
  }

  const { request, offer, candidate, application, job, states, progress } = state;
  const allLocked = states.every((item) => item.verified);

  return (
    <CandidatePortalShell
      eyebrow="Ecometrix · Joining Formalities"
      title="Submit your joining documents"
      subtitle="Upload each required document. Files are stored against your application and are visible to HR only after final submission."
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
            <dd className="detail-item__value">{offer?.designation || job?.title}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Offer status</dt>
            <dd className="detail-item__value">Accepted</dd>
          </div>
          <div>
            <dt className="detail-item__label">Proposed joining date</dt>
            <dd className="detail-item__value">{formatDate(offer?.joiningDate)}</dd>
          </div>
          <div>
            <dt className="detail-item__label">Submission status</dt>
            <dd className="detail-item__value">
              {request.status === 'submitted' ? 'Submitted' : 'Awaiting documents'}
            </dd>
          </div>
        </dl>

        <div className="cp-progress" aria-hidden="false">
          <div className="cp-progress__head">
            <span className="cp-progress__label">Mandatory documents ready</span>
            <span className="cp-progress__value">
              {progress.mandatoryDone} of {progress.mandatoryTotal} · {progress.percent}%
            </span>
          </div>
          <div
            className="cp-progress__track"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Mandatory document progress"
          >
            <div className="cp-progress__bar" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>

        <ul className="cp-doc-list">
          {states.map((requirement) => {
            const meta = getDocumentStatusMeta(
              requirement.state === 'staged'
                ? 'pending'
                : requirement.state === 'awaiting'
                  ? 'pending'
                  : requirement.state
            );
            const staged = requirement.stagedDocument;
            const current = requirement.currentDocument;
            const locked = requirement.verified;
            const canUpload = requirement.canUpload && !locked;
            const docErrors = errors[requirement.type];

            return (
              <li
                className={`cp-doc ${requirement.state === 'submitted' || staged ? '' : ''} ${
                  requirement.verified ? 'cp-doc--done' : ''
                }`}
                key={requirement.type}
              >
                <span className="cp-doc__icon">
                  {requirement.verified ? (
                    <CheckCircle2 size={18} aria-hidden="true" />
                  ) : (
                    <FileText size={18} aria-hidden="true" />
                  )}
                </span>
                <div className="cp-doc__body">
                  <div className="cp-doc__title">
                    {requirement.label}
                    {requirement.mandatory ? (
                      <span className="field__required" aria-hidden="true" title="Required">
                        {' '}
                        *
                      </span>
                    ) : (
                      <span className="cell-muted"> · optional{requirement.note ? ` (${requirement.note})` : ''}</span>
                    )}
                  </div>
                  {current && (
                    <div className="cp-doc__note">
                      Current version v{current.version || 1}:{' '}
                      <Badge variant={meta.variant} dot>
                        {requirement.state === 'resubmission_required'
                          ? 'Resubmission Required'
                          : meta.label}
                      </Badge>
                    </div>
                  )}
                  {staged && (
                    <div className="cp-doc__file">
                      Staged: {staged.fileName} · {formatFileSize(staged.sizeBytes)} — submit to
                      send it to HR.
                    </div>
                  )}
                  {!staged && !current && (
                    <div className="cp-doc__note">No file uploaded yet.</div>
                  )}
                  {current?.remarks && requirement.state === 'resubmission_required' && (
                    <div className="cp-doc__error">HR remark: {current.remarks}</div>
                  )}
                  {docErrors?.length > 0 && (
                    <div className="cp-doc__error" role="alert">
                      {docErrors.join(' ')}
                    </div>
                  )}
                </div>
                <div className="cp-doc__actions">
                  <input
                    ref={(element) => {
                      fileInputs.current[requirement.type] = element;
                    }}
                    id={`cp-file-${requirement.type}`}
                    className="cp-file-input"
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    aria-label={`Upload ${requirement.label}`}
                    onChange={(event) => handleFileSelect(requirement, event)}
                    disabled={!canUpload}
                  />
                  {staged && (
                    <>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => handlePreviewStaged(requirement)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleRemoveStaged(requirement)}
                        disabled={busy}
                        aria-label={`Remove staged ${requirement.label}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </>
                  )}
                  {canUpload && (
                    <label
                      htmlFor={`cp-file-${requirement.type}`}
                      className="btn btn--outline btn--sm"
                      style={{ cursor: 'pointer' }}
                    >
                      <Upload size={14} aria-hidden="true" />
                      {current ? 'Replace' : 'Select file'}
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="detail-item__value detail-item__value--muted" style={{ marginTop: '1rem' }}>
          Accepted types: PDF, DOC, DOCX · maximum {UPLOAD_MAX_LABEL} per file. Both the extension
          and the file type are checked before staging.
        </p>

        {message && (
          <div
            className={`notice ${message.tone === 'error' ? 'notice--error' : 'notice--info'}`}
            role="alert"
            style={{ marginTop: '0.9rem' }}
          >
            <span className="notice__icon">
              <AlertCircle size={18} aria-hidden="true" />
            </span>
            <div className="notice__body">{message.text}</div>
          </div>
        )}

        <div className="ta-choice-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={busy || stagedCount === 0 || allLocked}
          >
            {busy ? (
              <>
                <Loader2 size={16} aria-hidden="true" /> Submitting…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} aria-hidden="true" /> Submit documents
                {stagedCount > 0 ? ` (${stagedCount})` : ''}
              </>
            )}
          </button>
          <span className="detail-item__value detail-item__value--muted" style={{ alignSelf: 'center' }}>
            {stagedCount === 0
              ? 'Stage at least one file to submit.'
              : `${stagedCount} file(s) staged — press submit to send to HR.`}
          </span>
        </div>

        <p className="detail-item__value detail-item__value--muted" style={{ marginTop: '0.9rem' }}>
          <ShieldAlert size={12} aria-hidden="true" /> This development link is a mock token, not
          production authentication. Do not share it.
        </p>
      </div>
    </CandidatePortalShell>
  );
}
