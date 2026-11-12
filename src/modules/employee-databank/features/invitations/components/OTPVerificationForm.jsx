import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import Button from '../../../../../shared/components/Button.jsx';
import { useToast } from '../../../../../shared/components/Toast.jsx';
import invitationService from '../services/invitationService.js';
import { OTP_LENGTH } from '../../../constants/employeeStatus.js';
import { formatCountdown } from '../../../utils/formatDate.js';

function OtpInput({ value = '', onChange, disabled = false, length = OTP_LENGTH }) {
  const refs = useRef([]);
  const [digits, setDigits] = useState(() =>
    Array.from({ length }, (_, index) => value[index] || '')
  );

  useEffect(() => {
    setDigits((current) => {
      const next = Array.from({ length }, (_, index) => value[index] || '');
      return current.join('') === next.join('') ? current : next;
    });
  }, [value, length]);

  const commit = (nextDigits) => {
    setDigits(nextDigits);
    onChange?.(nextDigits.join(''));
  };

  const setDigit = (index, digit) => {
    const next = [...digits];
    next[index] = digit;
    commit(next);
  };

  const handleChange = (index, event) => {
    const digit = event.target.value.replace(/\D/g, '').slice(-1);
    if (!digit) {
      setDigit(index, '');
      return;
    }
    setDigit(index, digit);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        refs.current[index - 1]?.focus();
      }
    }
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = Array.from({ length }, (_, index) => pasted[index] || '');
    commit(next);
    const focusIndex = Math.min(pasted.length, length - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div className="otp-input" role="group" aria-label="Six digit verification code">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className="otp-input__box"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digits[index] || ''}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

export default function OTPVerificationForm({ invitation, onVerified }) {
  const toast = useToast();
  const [request, setRequest] = useState(null);
  const [otp, setOtp] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isExpired = request ? new Date(request.expiresAt).getTime() <= now : false;

  const handleRequestOtp = async () => {
    setError('');
    setRequesting(true);
    try {
      const response = await invitationService.requestOtp(invitation.token);
      setRequest(response);
      setOtp('');
      toast.info('Mock OTP generated. No email was sent — the code is shown on screen.');
    } catch (requestError) {
      setError(requestError.message || 'The OTP could not be generated.');
    } finally {
      setRequesting(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError('Enter the full six-digit code.');
      return;
    }

    setError('');
    setVerifying(true);
    try {
      const updatedInvitation = await invitationService.verifyOtp(invitation.token, otp);
      toast.success('Email verified. You can now complete your employee profile.');
      onVerified?.(updatedInvitation);
    } catch (verifyError) {
      setError(verifyError.message || 'The OTP could not be verified.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="otp-panel">
      <div className="otp-panel__head">
        <span className="otp-panel__icon">
          <ShieldCheck size={24} aria-hidden="true" />
        </span>
        <div>
          <h2 className="otp-panel__title">Verify your email address</h2>
          <p className="otp-panel__subtitle">
            We will send a six-digit code to <strong>{invitation.email}</strong>
          </p>
        </div>
      </div>

      {!request ? (
        <div className="otp-panel__body">
          <div className="notice notice--info">
            <span className="notice__icon">
              <MailCheck size={18} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Mock mode</div>
              No real email is sent. The generated demonstration code will be displayed here after
              you request it.
            </div>
          </div>
          <Button icon={KeyRound} onClick={handleRequestOtp} loading={requesting} block>
            {requesting ? 'Generating OTP…' : 'Send OTP to my email'}
          </Button>
        </div>
      ) : (
        <form className="otp-panel__body" onSubmit={handleVerify}>
          <div className="notice notice--warning">
            <span className="notice__icon">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <div className="notice__body">
              <div className="notice__title">Mock email preview — not a real delivery</div>
              Your demonstration OTP is{' '}
              <span className="mock-code">{request.delivery?.code || '------'}</span>. It expires in{' '}
              <strong>{isExpired ? '00:00' : formatCountdown(request.expiresAt, now)}</strong>.
            </div>
          </div>

          <label className="field__label" htmlFor="otp-group">
            Enter the six-digit code
          </label>
          <OtpInput value={otp} onChange={setOtp} disabled={verifying} />

          {error && (
            <div className="form-alert form-alert--error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="otp-panel__actions">
            <Button type="submit" icon={CheckCircle2} loading={verifying} disabled={otp.length !== OTP_LENGTH || isExpired}>
              Verify OTP
            </Button>
            <Button
              type="button"
              variant="ghost"
              icon={RefreshCw}
              onClick={handleRequestOtp}
              loading={requesting}
            >
              Resend OTP
            </Button>
          </div>
        </form>
      )}

      {error && !request && (
        <div className="form-alert form-alert--error" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
