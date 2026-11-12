import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MailX,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import EcometrixLogo from '../../../shared/components/EcometrixLogo.jsx';
import OTPVerificationForm from '../features/invitations/components/OTPVerificationForm.jsx';
import EmployeeForm from '../features/employees/components/EmployeeForm.jsx';
import invitationService from '../features/invitations/services/invitationService.js';
import submissionService from '../features/submissions/services/submissionService.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';
import '../styles/employeeProfile.css';

const STEPS = ['Verify email', 'Complete profile', 'Submitted'];

function MessageState({ icon: Icon, tone = 'neutral', title, description, children }) {
  return (
    <div className="onboarding-message">
      <div className={`onboarding-message__icon onboarding-message__icon--${tone}`}>
        <Icon size={26} aria-hidden="true" />
      </div>
      <h2 className="onboarding-message__title">{title}</h2>
      <p className="onboarding-message__text">{description}</p>
      {children}
    </div>
  );
}

export default function EmployeeOnboardingPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [invitation, setInvitation] = useState(null);
  const [step, setStep] = useState('verify');
  const [submission, setSubmission] = useState(null);
  const [draftState, setDraftState] = useState('idle');
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [savedLater, setSavedLater] = useState(false);
  const draftTimerRef = useRef(null);
  const draftSavingRef = useRef(false);
  const pendingDraftRef = useRef(null);
  const submitStartedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setStatus('loading');
      try {
        const invitationRecord = await invitationService.getInvitationByToken(token);
        if (!active) return;

        if (!invitationRecord) {
          setStatus('invalid');
          return;
        }

        if (invitationRecord.status === 'expired') {
          setInvitation(invitationRecord);
          setStatus('expired');
          return;
        }

        if (invitationRecord.status === 'completed') {
          setInvitation(invitationRecord);
          setStatus('completed');
          return;
        }

        // Opening the link is recorded, the draft and the completion are kept.
        const ready = (await invitationService.markOpened(token)) || invitationRecord;

        if (!active) return;
        setInvitation(ready);
        setDraftSavedAt(ready.draftUpdatedAt || null);
        setStep(ready.emailVerified ? 'form' : 'verify');
        setStatus('ready');
      } catch {
        if (active) setStatus('invalid');
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [token]);

  const persistDraft = useCallback(async () => {
    if (submitStartedRef.current || draftSavingRef.current) return;
    const draft = pendingDraftRef.current;
    if (!draft) return;

    pendingDraftRef.current = null;
    draftSavingRef.current = true;
    setDraftState('saving');

    try {
      const updated = await invitationService.saveDraft(token, draft);
      if (!mountedRef.current) return;
      setInvitation(updated);
      setDraftSavedAt(updated.draftUpdatedAt);
      setDraftState(pendingDraftRef.current ? 'saving' : 'saved');
    } catch {
      if (mountedRef.current) setDraftState('error');
    } finally {
      draftSavingRef.current = false;
      if (pendingDraftRef.current && !submitStartedRef.current) {
        if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = window.setTimeout(() => persistDraft(), 250);
      }
    }
  }, [token]);

  const handleDraftChange = useCallback(
    (draft) => {
      if (submitStartedRef.current) return;
      pendingDraftRef.current = draft;
      setDraftState('saving');
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = window.setTimeout(() => persistDraft(), 600);
    },
    [persistDraft]
  );

  const handleVerified = (updatedInvitation) => {
    setInvitation(updatedInvitation);
    setStep('form');
  };

  const handleSaveLater = async (payload) => {
    try {
      const updated = await invitationService.saveDraft(token, payload);
      if (!mountedRef.current) return;
      pendingDraftRef.current = null;
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
      setInvitation(updated);
      setDraftSavedAt(updated.draftUpdatedAt);
      setDraftState('saved');
      setSavedLater(true);
    } catch (error) {
      if (!mountedRef.current) return;
      setDraftState('error');
      throw error;
    }
  };

  const handleSubmit = async (payload) => {
    submitStartedRef.current = true;
    pendingDraftRef.current = null;
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);

    try {
      const createdSubmission = await submissionService.createSubmission(token, payload);
      setSubmission(createdSubmission);
      setStatus('submitted');
    } catch (error) {
      submitStartedRef.current = false;
      throw error;
    }
  };

  const activeStep = status === 'submitted' ? 2 : step === 'form' ? 1 : 0;
  const initialFormData = invitation
    ? {
        ...(invitation.profileDraft || {}),
        fullName: invitation.profileDraft?.fullName || invitation.fullName || '',
        email: invitation.email || invitation.profileDraft?.email || '',
        cv: invitation.profileDraft?.cv || null,
      }
    : null;

  return (
    <div className="onboarding">
      <header className="onboarding__header">
        <div className="onboarding__brand">
          <EcometrixLogo className="onboarding__logo-frame" />
          <div>
            <div className="onboarding__brand-name">Employee CV Management</div>
            <div className="onboarding__brand-sub">Ecometrix HR Self-Service</div>
          </div>
        </div>
        <span className="onboarding__secure">
          <ShieldCheck size={15} aria-hidden="true" />
          Secure onboarding · mock mode
        </span>
      </header>

      <main className="onboarding__main">
        <div className="onboarding__intro">
          <span className="page-header__eyebrow">
            <Sparkles size={13} aria-hidden="true" />
            Employee Profile Onboarding
          </span>
          <h1 className="onboarding__title">Welcome to the Ecometrix Employee Databank</h1>
          <p className="onboarding__subtitle">
            Verify your email, complete your employee profile, and attach your CV. HR will review
            your submission before it is added to the current employee databank.
          </p>

          <ol className="onboarding-steps" aria-label="Onboarding progress">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={`onboarding-step ${
                  index === activeStep ? 'active' : index < activeStep ? 'done' : ''
                }`}
              >
                <span className="onboarding-step__marker">
                  {index < activeStep ? <CheckCircle2 size={15} /> : index + 1}
                </span>
                <span>{label}</span>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="onboarding-step__arrow" size={14} aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <section className="onboarding__card">
          {status === 'loading' && (
            <div className="loading-block">
              <div className="spinner" />
              Checking your invitation…
            </div>
          )}

          {status === 'invalid' && (
            <MessageState
              icon={MailX}
              tone="error"
              title="This invitation link is not valid"
              description="The link may be incorrect or the invitation may have been removed. Ask the HR team to send a new invitation."
            >
              <div className="notice notice--neutral" style={{ marginTop: '1rem' }}>
                <span className="notice__icon">
                  <ShieldCheck size={17} aria-hidden="true" />
                </span>
                <div className="notice__body">
                  For security, invitation links are unique and should only be shared with the
                  intended employee.
                </div>
              </div>
            </MessageState>
          )}

          {status === 'expired' && (
            <MessageState
              icon={Clock3}
              tone="warning"
              title="This invitation has expired"
              description={`The invitation for ${invitation?.email || 'your email'} expired on ${
                invitation?.expiresAt ? formatDate(invitation.expiresAt) : 'an earlier date'
              }. HR can send a reminder to renew the link. Any saved profile draft is preserved.`}
            />
          )}

          {status === 'completed' && (
            <MessageState
              icon={CheckCircle2}
              tone="success"
              title="Your profile has already been submitted"
              description="Your employee profile is waiting for HR validation, or has already been validated. You do not need to submit it again."
            />
          )}

          {status === 'submitted' && (
            <MessageState
              icon={CheckCircle2}
              tone="success"
              title="Profile submitted successfully"
              description="Thank you. Your profile and CV are now in the HR Submissions queue. HR will validate your information before it is added to the Current Employees databank."
            >
              <div className="submission-reference">
                <span className="detail-item__label">Submission reference</span>
                <strong>{submission?.id}</strong>
                <span className="cell-muted">
                  Submitted for {submission?.email || invitation?.email}
                </span>
              </div>
              <div className="notice notice--info" style={{ marginTop: '1rem' }}>
                <span className="notice__icon">
                  <ShieldCheck size={17} aria-hidden="true" />
                </span>
                <div className="notice__body">
                  No further action is required from you. This is a frontend demonstration —
                  submission data is stored in local mock storage only.
                </div>
              </div>
            </MessageState>
          )}

          {status === 'ready' && step === 'verify' && invitation && (
            <OTPVerificationForm invitation={invitation} onVerified={handleVerified} />
          )}

          {status === 'ready' && step === 'form' && invitation && (
            <div className="onboarding-form">
              <div className="onboarding-form__head">
                <h2 className="onboarding-form__title">Complete your employee profile</h2>
                <p className="onboarding-form__subtitle">
                  Signed in as <strong>{invitation.email}</strong>. Fields marked with an asterisk
                  are required. Your CV is required for self-service submission.
                </p>
                <div
                  className={`draft-status draft-status--${draftState}`}
                  role="status"
                  aria-live="polite"
                >
                  {draftState === 'saving' && (
                    <>
                      <Loader2 size={14} className="draft-status__spinner" aria-hidden="true" />
                      Saving draft…
                    </>
                  )}
                  {draftState === 'saved' && (
                    <>
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Draft saved
                      {draftSavedAt ? ` ${formatDateTime(draftSavedAt)}` : ''}
                    </>
                  )}
                  {draftState === 'error' && (
                    <>
                      <AlertCircle size={14} aria-hidden="true" />
                      Draft could not be saved. Your changes remain in this browser session.
                    </>
                  )}
                  {draftState === 'idle' && invitation.draftUpdatedAt && (
                    <>
                      <Clock3 size={14} aria-hidden="true" />
                      Draft last saved {formatDateTime(invitation.draftUpdatedAt)}
                    </>
                  )}
                </div>
                {savedLater && (
                  <div className="notice notice--success" style={{ marginTop: '0.8rem' }}>
                    <span className="notice__icon">
                      <CheckCircle2 size={17} aria-hidden="true" />
                    </span>
                    <div className="notice__body">
                      <div className="notice__title">Your progress is saved</div>
                      You can close this window and return later with the same invitation link.
                      Your saved information, including your CV, will be waiting for you.
                    </div>
                  </div>
                )}
              </div>
              <EmployeeForm
                mode="onboarding"
                initialData={initialFormData}
                hideFields={['employeeId']}
                readOnlyFields={['email']}
                requireCv
                submitLabel="Submit Profile"
                onSubmit={handleSubmit}
                onDraftChange={handleDraftChange}
                onSaveLater={handleSaveLater}
              />
            </div>
          )}
        </section>

        <p className="onboarding__footer">
          Frontend demonstration only. No real invitation email or OTP is delivered, and files are
          not stored in secure document storage. Do not enter real confidential employee data.
        </p>
      </main>
    </div>
  );
}
