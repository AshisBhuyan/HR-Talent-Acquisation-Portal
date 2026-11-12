import { useRef, useState } from 'react';
import { AlertCircle, UploadCloud } from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import CVFileInfo from './CVFileInfo.jsx';
import useCVUpload from '../hooks/useCVUpload.js';
import { CV_ACCEPT_ATTRIBUTE, CV_MAX_SIZE_MB } from '../../../constants/fileRules.js';
import '../../../styles/cvManagement.css';

export default function CVUpload({
  value = null,
  onChange,
  label = 'CV & Documents',
  required = false,
  hint,
  disabled = false,
}) {
  const { upload, replace, remove, progress, uploading, error } = useCVUpload({
    value,
    onChange,
  });
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const openPicker = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleFile = (file) => {
    if (!file || disabled || uploading) return;
    if (value) {
      replace(file);
    } else {
      upload(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="field">
      <div className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
        {!required && <span className="field__optional">(recommended)</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
        className="visually-hidden"
        tabIndex={-1}
      />

      {value ? (
        <CVFileInfo
          cv={value}
          onReplace={handleFile}
          onRemove={remove}
          uploading={uploading}
          disabled={disabled}
        />
      ) : (
        <div
          className={`cv-dropzone ${dragActive ? 'cv-dropzone--active' : ''} ${
            uploading ? 'cv-dropzone--uploading' : ''
          } ${error ? 'cv-dropzone--error' : ''}`}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          aria-label="Upload CV. Click or press Enter to choose a file."
        >
          <div className="cv-dropzone__icon">
            <UploadCloud size={26} aria-hidden="true" />
          </div>
          {uploading ? (
            <div className="cv-dropzone__progress">
              <p className="cv-dropzone__title">Uploading CV… {progress}%</p>
              <div className="cv-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="cv-progress__bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <p className="cv-dropzone__title">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="cv-dropzone__hint">
                PDF, DOC or DOCX · Maximum {CV_MAX_SIZE_MB} MB
              </p>
              <Button variant="outline" size="sm" type="button" tabIndex={-1}>
                Choose CV file
              </Button>
            </>
          )}
        </div>
      )}

      {uploading && value && (
        <div className="cv-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="cv-progress__bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && (
        <span className="field__error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      )}

      {!error && hint && <span className="field__hint">{hint}</span>}

      <span className="field__hint">
        Demo mode: files stay in this browser session only. Replace the CV service with protected
        backend storage before production.
      </span>
    </div>
  );
}
