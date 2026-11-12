import { useState } from 'react';
import { Download, Eye, FileText, Trash2 } from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import ConfirmDialog from '../../../../../shared/components/ConfirmDialog.jsx';
import { useToast } from '../../../../../shared/components/Toast.jsx';
import CVPreview from './CVPreview.jsx';
import CVReplace from './CVReplace.jsx';
import cvService from '../services/cvService.js';
import { formatFileSize } from '../validation/cvValidation.js';
import { formatDate } from '../../../utils/formatDate.js';
import '../../../styles/cvManagement.css';

function typeLabel(cv) {
  const name = String(cv?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF document';
  if (name.endsWith('.docx')) return 'Word document (.docx)';
  if (name.endsWith('.doc')) return 'Word document (.doc)';
  return 'Document';
}

export default function CVFileInfo({
  cv,
  onReplace,
  onRemove,
  uploading = false,
  disabled = false,
  showReplace = true,
  showRemove = true,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  if (!cv) return null;

  const handleDownload = () => {
    try {
      cvService.downloadCV(cv);
      toast.success('CV download started.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="cv-file">
      <div className="cv-file__icon">
        <FileText size={22} aria-hidden="true" />
      </div>

      <div className="cv-file__info">
        <div className="cv-file__name" title={cv.name}>
          {cv.name}
        </div>
        <div className="cv-file__meta">
          {formatFileSize(cv.size)} · {typeLabel(cv)}
          {cv.uploadedAt ? ` · Uploaded ${formatDate(cv.uploadedAt)}` : ''}
        </div>
        {cv.seeded && <span className="cv-file__tag">Demo metadata</span>}
      </div>

      <div className="cv-file__actions">
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={() => setPreviewOpen(true)}
          type="button"
        >
          Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={Download}
          onClick={handleDownload}
          type="button"
        >
          Download
        </Button>
        {showReplace && onReplace && (
          <CVReplace onReplace={onReplace} uploading={uploading} disabled={disabled} />
        )}
        {showRemove && onRemove && (
          <Button
            variant="danger-ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setConfirmOpen(true)}
            disabled={disabled}
            type="button"
          >
            Remove
          </Button>
        )}
      </div>

      <CVPreview cv={cv} open={previewOpen} onClose={() => setPreviewOpen(false)} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          onRemove?.();
          setConfirmOpen(false);
          toast.success('CV removed.');
        }}
        title="Remove this CV?"
        message={`“${cv.name}” will be removed. You can upload a replacement CV before saving.`}
        confirmLabel="Remove CV"
      />
    </div>
  );
}
