import { useEffect, useState } from 'react';
import { Download, FileWarning } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import cvService from '../services/cvService.js';
import { useToast } from '../../../../../shared/components/Toast.jsx';

function isPdf(cv) {
  return cv?.type === 'application/pdf' || String(cv?.name || '').toLowerCase().endsWith('.pdf');
}

export default function CVPreview({ cv, open, onClose }) {
  const [url, setUrl] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (open && cv) {
      setUrl(cvService.getCVUrl(cv));
    } else {
      setUrl(null);
    }
  }, [open, cv]);

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
    <Modal
      open={open}
      onClose={onClose}
      title="CV preview"
      subtitle={cv.name}
      size="xl"
      footer={
        <>
          <span className="modal__footer-note">
            Browser preview uses a temporary object URL in this demo session.
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button icon={Download} onClick={handleDownload} disabled={!url}>
            Download CV
          </Button>
        </>
      }
    >
      {!url && (
        <div className="notice notice--warning">
          <span className="notice__icon">
            <FileWarning size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Preview unavailable for demo metadata</div>
            This document is a seeded mock record without a stored file. Upload a real PDF or Word
            CV during this browser session to preview it here.
          </div>
        </div>
      )}

      {url && isPdf(cv) && (
        <iframe className="cv-preview__frame" src={url} title={`Preview of ${cv.name}`} />
      )}

      {url && !isPdf(cv) && (
        <div className="notice notice--info">
          <span className="notice__icon">
            <FileWarning size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Inline preview is limited</div>
            Word documents cannot be rendered reliably in the browser. Download the file to review
            it in your word processor.
          </div>
        </div>
      )}
    </Modal>
  );
}
