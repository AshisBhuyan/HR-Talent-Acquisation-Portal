import { Download, FileWarning } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import {
  formatFileSize,
  getDocumentTypeLabel,
} from '../../../constants/candidateDocumentRules.js';
import { formatDate } from '../../../utils/formatDate.js';

/**
 * Inline preview of a candidate document. The preview URL is created for the
 * current browser session only.
 */
export default function DocumentPreviewModal({
  document,
  url,
  open,
  onClose,
  onDownload,
}) {
  if (!document) return null;

  const isUnavailable = !document.fileName;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={document.fileName || 'Candidate document'}
      subtitle={`${getDocumentTypeLabel(document.type)} · ${formatFileSize(document.sizeBytes)} · uploaded ${formatDate(
        document.uploadedAt
      )}`}
      size="xl"
      footer={
        <>
          <span className="modal__footer-note">
            The preview is rendered from the document metadata in this browser session.
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button icon={Download} onClick={() => onDownload(document)} disabled={isUnavailable}>
            Download
          </Button>
        </>
      }
    >
      {isUnavailable && (
        <div className="notice notice--warning">
          <span className="notice__icon">
            <FileWarning size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Document unavailable</div>
            The Career Portal has not delivered a file for this document yet.
          </div>
        </div>
      )}

      {!isUnavailable && (
        <iframe
          className="ta-doc-preview"
          src={url || undefined}
          title={`Preview of ${document.fileName}`}
        />
      )}
    </Modal>
  );
}
