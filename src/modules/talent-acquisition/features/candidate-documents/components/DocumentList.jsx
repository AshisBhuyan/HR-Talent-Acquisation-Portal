import { Download, Eye, FileText, FileWarning } from 'lucide-react';
import Badge from '../../../../../shared/components/Badge.jsx';
import { formatFileSize, getDocumentTypeLabel } from '../../../constants/candidateDocumentRules.js';
import { formatDate } from '../../../utils/formatDate.js';

/**
 * Lists the documents a candidate submitted through the Career Portal. Only
 * the metadata is stored; the preview and download actions are served by the
 * document service.
 */
export default function DocumentList({ documents, loading, onPreview, onDownload }) {
  if (loading) {
    return (
      <div className="ta-document-list">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="ta-document" key={`skeleton-${index}`}>
            <div className="skeleton skeleton--line" />
          </div>
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="notice notice--warning">
        <span className="notice__icon">
          <FileWarning size={18} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">No documents submitted</div>
          The candidate has not uploaded a CV or any supporting document through the Career Portal.
        </div>
      </div>
    );
  }

  return (
    <ul className="ta-document-list">
      {documents.map((document) => (
        <li className="ta-document" key={document.documentId}>
          <span className="ta-document__icon">
            <FileText size={18} aria-hidden="true" />
          </span>
          <div className="ta-document__body">
            <div className="ta-document__name">{document.fileName || 'Unnamed document'}</div>
            <div className="ta-document__meta">
              <Badge variant="blue">{getDocumentTypeLabel(document.type)}</Badge>
              <span>{document.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}</span>
              <span>{formatFileSize(document.sizeBytes)}</span>
              <span>Uploaded {formatDate(document.uploadedAt)}</span>
            </div>
          </div>
          <div className="ta-document__actions">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => onPreview(document)}
              disabled={!document.isAvailable}
              aria-label={`Preview ${document.fileName}`}
            >
              <Eye size={14} aria-hidden="true" /> Preview
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onDownload(document)}
              disabled={!document.isAvailable}
              aria-label={`Download ${document.fileName}`}
            >
              <Download size={14} aria-hidden="true" /> Download
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
