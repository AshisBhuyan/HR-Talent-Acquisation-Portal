import { useEffect, useRef, useState } from 'react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Select, Textarea } from '../../../../../shared/components/Input.jsx';
import {
  UPLOAD_ACCEPT,
  UPLOAD_MAX_LABEL,
  validateUploadFile,
  getRequestDocumentLabel,
} from '../../../constants/documentRequestRules.js';
import { makeStorageKey, putBlob } from '../../../services/documentStorage.js';

const DOCUMENT_TYPE_OPTIONS = [
  'identity',
  'address',
  'photograph',
  'degree',
  'marksheets',
  'educational_certificates',
  'professional_certificate',
  'previous_employment',
  'experience_certificate',
  'relieving_letter',
  'bank',
  'emergency_contact',
  'employment_details',
  'other',
].map((value) => ({ value, label: getRequestDocumentLabel(value) }));

/**
 * HR-side "record submitted document" dialog. A real file picker is used;
 * the blob is stored in IndexedDB and the metadata is recorded in the
 * joining record.
 */
export default function AddJoiningDocumentModal({
  open,
  joiningId,
  loading,
  onClose,
  onSubmit,
}) {
  const [type, setType] = useState('identity');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setType('identity');
    setRemarks('');
    setFile(null);
    setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open]);

  if (!open) return null;

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) {
      setFile(null);
      return;
    }
    const validation = validateUploadFile(selected);
    if (!validation.valid) {
      setFile(null);
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrors(['Select a file to record.']);
      return;
    }

    const storageKey = makeStorageKey([
      'hr',
      joiningId || 'joining',
      type,
      String(Date.now()),
    ]);
    try {
      await putBlob(storageKey, file);
    } catch (storageError) {
      setErrors([storageError.message || 'The file could not be stored in this browser.']);
      return;
    }

    onSubmit({
      type,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      storageKey,
      remarks: remarks.trim(),
      by: 'HR Administrator',
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record submitted document"
      subtitle="Attach the file the candidate provided. The file is stored against the joining record."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!file}>
            Record document
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select
          label="Document type"
          required
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={DOCUMENT_TYPE_OPTIONS}
        />

        <div className="field field--full">
          <label className="field__label" htmlFor="jd-file">
            File <span className="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="jd-file"
            ref={fileInputRef}
            className="input"
            type="file"
            accept={UPLOAD_ACCEPT}
            onChange={handleFileChange}
          />
          <p className="field__hint">PDF, DOC or DOCX · maximum {UPLOAD_MAX_LABEL}.</p>
          {file && (
            <p className="field__hint">
              Selected: <strong>{file.name}</strong> ({Math.round(file.size / 102.4) / 100} MB)
            </p>
          )}
          {errors.length > 0 && (
            <p className="field__error" role="alert">
              {errors.join(' ')}
            </p>
          )}
        </div>

        <div className="field field--full">
          <Textarea
            label="Remarks"
            optional
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Where the document was received, or notes for verification"
          />
        </div>
      </div>
    </Modal>
  );
}
