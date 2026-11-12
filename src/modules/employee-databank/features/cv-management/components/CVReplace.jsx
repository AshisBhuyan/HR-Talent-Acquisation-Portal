import { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import { CV_ACCEPT_ATTRIBUTE } from '../../../constants/fileRules.js';

export default function CVReplace({
  onReplace,
  uploading = false,
  disabled = false,
  label = 'Replace CV',
}) {
  const inputRef = useRef(null);

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onReplace?.(file);
    }
    event.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT_ATTRIBUTE}
        onChange={handleChange}
        className="visually-hidden"
        tabIndex={-1}
      />
      <Button
        variant="outline"
        size="sm"
        icon={RefreshCw}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        loading={uploading}
        type="button"
      >
        {uploading ? 'Uploading…' : label}
      </Button>
    </>
  );
}
