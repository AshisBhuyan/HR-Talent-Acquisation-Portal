import { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Mail, Send } from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import { Input } from '../../../../../shared/components/Input.jsx';
import { useToast } from '../../../../../shared/components/Toast.jsx';
import useInvitations from '../hooks/useInvitations.js';
import { EMAIL_REGEX } from '../../employees/validation/employeeSchema.js';

export default function InvitationForm({ onSuccess, onDone }) {
  const { sendInvitation } = useInvitations();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setErrors({});
    setFormError('');
    setResult(null);
    setCopied(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    const nextErrors = {};
    if (!email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setFormError('');
    setSending(true);

    try {
      const response = await sendInvitation({ email: email.trim(), fullName: fullName.trim() });
      setResult(response);
      toast.success('Invitation created in mock mode. No real email was sent.');
      onSuccess?.(response);
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors);
      setFormError(error.message || 'The invitation could not be created.');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    const link = result?.delivery?.inviteLink;
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invitation link copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy automatically. Select the link and copy it manually.');
    }
  };

  if (result) {
    return (
      <div className="invite-result">
        <div className="invite-result__head">
          <span className="invite-result__icon">
            <CheckCircle2 size={22} aria-hidden="true" />
          </span>
          <div>
            <h3 className="invite-result__title">Invitation created</h3>
            <p className="invite-result__text">
              For <strong>{result.invitation.email}</strong>
            </p>
          </div>
        </div>

        <div className="notice notice--warning">
          <span className="notice__icon">
            <AlertCircle size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Mock email delivery — no real email was sent</div>
            {result.delivery?.message ||
              'Connect invitationService.sendInvitation to the backend email provider to deliver this invitation.'}
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="invite-link">
            Employee invitation link
          </label>
          <div className="invite-result__link-row">
            <input
              id="invite-link"
              className="input"
              value={result.delivery?.inviteLink || ''}
              readOnly
              onFocus={(event) => event.target.select()}
            />
            <Button variant="outline" icon={Copy} onClick={handleCopy} type="button">
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <span className="field__hint">
            Open this link to demonstrate OTP verification and employee self-service onboarding.
          </span>
        </div>

        <div className="form-actions">
          <Button variant="outline" onClick={resetForm} type="button">
            Send another invitation
          </Button>
          <a
            className="btn btn--primary"
            href={result.delivery?.inviteLink}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Open invitation
          </a>
          {onDone && (
            <Button onClick={onDone} type="button">
              Done
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="form-alert form-alert--error" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <div className="form-grid">
        <Input
          label="Employee Full Name"
          optional
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="e.g. Ananya Sharma"
          autoComplete="name"
          disabled={sending}
          className="field--full"
        />
        <Input
          label="Employee Email Address"
          required
          type="email"
          icon={Mail}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email) setErrors({});
          }}
          error={errors.email}
          placeholder="employee@company.com"
          autoComplete="email"
          disabled={sending}
          className="field--full"
        />
      </div>

      <div className="notice notice--info" style={{ marginTop: '1rem' }}>
        <span className="notice__icon">
          <Mail size={17} aria-hidden="true" />
        </span>
        <div className="notice__body">
          <div className="notice__title">Frontend mock mode</div>
          A real invitation email is not sent. The invitation link is generated locally so the
          onboarding and OTP screens can be demonstrated end to end.
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit" icon={Send} loading={sending}>
          {sending ? 'Creating invitation…' : 'Create Invitation'}
        </Button>
      </div>
    </form>
  );
}
