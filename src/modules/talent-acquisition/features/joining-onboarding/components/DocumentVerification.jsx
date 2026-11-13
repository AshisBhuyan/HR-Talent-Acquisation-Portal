import { useState } from 'react';
import { Download, Eye, FileText, FileWarning, ShieldCheck, XCircle } from 'lucide-react';
import Badge from '../../../../../shared/components/Badge.jsx';
import { getDocumentStatusMeta } from '../../../constants/joiningStatus.js';
import { formatDate, formatDateTime } from '../../../utils/formatDate.js';
import { formatFileSize } from '../../../constants/candidateDocumentRules.js';
import { getDocumentTypeLabel } from '../../../constants/joiningStatus.js';

/**
 * Document verification panel. Documents are shown with their verification
 * status and history; HR can verify, reject or request a resubmission.
 */
export default function DocumentVerification({
  entry,
  onPreview,
  onDownload,
  onVerify,
  onReject,
  loading,
}) {
  const [reasonById, setReasonById] = useState({});
  const [expandedById, setExpandedById] = useState({});

  const documents = entry?.documents || [];

  const setReason = (documentId, value) =>
    setReasonById((current) => ({ ...current, [documentId]: value }));

  const toggleReason = (documentId) =>
    setExpandedById((current) => ({ ...current, [documentId]: !current[documentId] }));

  if (documents.length === 0) {
    return (
      <div className="notice notice--warning">
        <span className="notice__icon">
          <FileWarning size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">No documents submitted yet</div>
          The candidate has not submitted any joining documents through the joining portal.
        </div>
      </div>
    );
  }

  return (
    <ul className="ta-document-list">
      {documents.map((document) => {
        const meta = getDocumentStatusMeta(document.status);
        const submitted = Boolean(document.submittedAt);
        const expanded = expandedById[document.documentId];

        return (
          <li className="ta-document" key={document.documentId}>
            <span className="ta-document__icon">
              <FileText size={18} aria-hidden="true" />
            </span>
            <div className="ta-document__body">
              <div className="ta-document__name">
                {document.fileName || 'Awaiting document'}
              </div>
              <div className="ta-document__meta">
                <Badge variant="blue">{getDocumentTypeLabel(document.type)}</Badge>
                <Badge variant={meta.variant} dot>
                  {meta.label}
                </Badge>
                <span>{String(document.mimeType || '').split('/')[1]?.toUpperCase() || 'FILE'}</span>
                <span>{formatFileSize(document.sizeBytes)}</span>
                <span>
                  {submitted ? `Submitted ${formatDate(document.submittedAt)}` : 'Not submitted'}
                </span>
              </div>
              {document.remarks && document.status !== 'verified' && (
                <p className="ta-document__meta" style={{ marginTop: '0.3rem' }}>
                  {document.remarks}
                </p>
              )}
              {Array.isArray(document.history) && document.history.length > 0 && (
                <details className="ta-document__history">
                  <summary>Verification history ({document.history.length})</summary>
                  <ol className="ta-timeline">
                    {[...document.history].reverse().map((item, index) => (
                      <li className="ta-timeline__item" key={`${item.at}-${index}`}>
                        <span className="ta-timeline__dot" aria-hidden="true" />
                        <div className="ta-timeline__body">
                          <div className="ta-timeline__event">{item.action}</div>
                          <div className="ta-timeline__meta">
                            {formatDateTime(item.at)}
                            {item.by ? ` · ${item.by}` : ''}
                          </div>
                          {item.remarks && <div className="ta-timeline__note">{item.remarks}</div>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {expanded && (
                <div className="ta-inline-form" style={{ gridTemplateColumns: '1fr auto' }}>
                  <input
                    className="input"
                    type="text"
                    value={reasonById[document.documentId] || ''}
                    placeholder="Rejection reason / resubmission instructions"
                    aria-label="Rejection reason"
                    onChange={(event) => setReason(document.documentId, event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => {
                      const reason = (reasonById[document.documentId] || '').trim();
                      if (!reason) return;
                      onReject(entry, document.documentId, reason);
                      setReason(document.documentId, '');
                      toggleReason(document.documentId);
                    }}
                    disabled={loading}
                  >
                    Send resubmission request
                  </button>
                </div>
              )}
            </div>
            <div className="ta-document__actions">
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onPreview(document)}
                disabled={!submitted}
                aria-label={`Preview ${document.fileName}`}
                title={submitted ? 'Preview document' : 'Not submitted'}
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onDownload(document)}
                disabled={!submitted}
                aria-label={`Download ${document.fileName}`}
                title={submitted ? 'Download document' : 'Not submitted'}
              >
                <Download size={16} />
              </button>
              {document.status !== 'verified' && (
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  onClick={() => onVerify(entry, document.documentId, true)}
                  disabled={!submitted || loading}
                  aria-label={`Verify ${document.fileName}`}
                  title="Verify document"
                >
                  <ShieldCheck size={16} />
                </button>
              )}
              {document.status !== 'resubmission_required' && submitted && (
                <button
                  type="button"
                  className="btn btn--danger-ghost btn--icon"
                  onClick={() => toggleReason(document.documentId)}
                  disabled={loading}
                  aria-label={`Request resubmission for ${document.fileName}`}
                  title="Request resubmission"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
