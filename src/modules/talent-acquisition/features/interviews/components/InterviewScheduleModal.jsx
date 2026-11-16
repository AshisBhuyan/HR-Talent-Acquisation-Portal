import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import { Input, Select, Textarea } from '../../../../../shared/components/Input.jsx';
import {
  buildInterviewPayload,
  validateInterviewForm,
} from '../validation/interviewValidation.js';
import {
  INTERVIEW_MODES,
  INTERVIEW_ROUNDS,
  INTERVIEW_STATUS,
  getInterviewTypeMeta,
} from '../../../constants/interviewStatus.js';
import {
  makeInterviewerId,
  normalizeInterviewers,
} from '../utils/interviewers.js';

function createEmptyForm() {
  return {
    applicationId: '',
    round: 'hr',
    interviewers: [{ id: makeInterviewerId(), name: '', email: '' }],
    scheduledDate: '',
    scheduledTime: '',
    mode: 'online',
    meetingLink: '',
    location: '',
    notes: '',
  };
}

/**
 * Schedules, edits or reschedules an interview round. Any number of
 * interviewers can be assigned; the interview type is derived from the count.
 */
export default function InterviewScheduleModal({
  open,
  interview,
  mode = 'create',
  candidates,
  interviews = [],
  onClose,
  onSubmit,
  loading,
}) {
  const [values, setValues] = useState(createEmptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    if (interview) {
      const date = new Date(interview.scheduledAt);
      const interviewers = normalizeInterviewers(interview).map(
        ({ id, name, email }) => ({ id, name, email })
      );
      setValues({
        applicationId: interview.applicationId,
        round: interview.round,
        interviewers:
          interviewers.length > 0
            ? interviewers
            : [{ id: makeInterviewerId(), name: '', email: '' }],
        scheduledDate: date.toISOString().slice(0, 10),
        scheduledTime: `${String(date.getHours()).padStart(2, '0')}:${String(
          date.getMinutes()
        ).padStart(2, '0')}`,
        mode: interview.mode,
        meetingLink: interview.meetingLink || '',
        location: interview.location || '',
        notes: interview.notes || '',
      });
    } else {
      setValues(createEmptyForm());
    }
    setErrors({});
  }, [open, interview]);

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleCandidateChange = (applicationId) => {
    setValues((current) => {
      const usedRounds = new Set(
        interviews
          .filter(
            (item) =>
              item.applicationId === applicationId &&
              item.status !== INTERVIEW_STATUS.CANCELLED &&
              item.interviewId !== interview?.interviewId
          )
          .map((item) => item.round)
      );
      const nextRound = usedRounds.has(current.round)
        ? INTERVIEW_ROUNDS.find((round) => !usedRounds.has(round.value))?.value ||
          current.round
        : current.round;
      return { ...current, applicationId, round: nextRound };
    });
    setErrors((current) => ({
      ...current,
      applicationId: undefined,
      round: undefined,
    }));
  };

  const handleModeChange = (value) => {
    setValues((current) => ({
      ...current,
      mode: value,
      meetingLink: value === 'online' ? current.meetingLink : '',
      location: value === 'offline' ? current.location : '',
    }));
    setErrors((current) => ({
      ...current,
      mode: undefined,
      meetingLink: undefined,
      location: undefined,
    }));
  };

  const updateInterviewer = (index, key, value) => {
    setValues((current) => ({
      ...current,
      interviewers: current.interviewers.map((interviewer, itemIndex) =>
        itemIndex === index ? { ...interviewer, [key]: value } : interviewer
      ),
    }));
    setErrors((current) => ({
      ...current,
      [`interviewers.${index}.${key}`]: undefined,
      interviewers: undefined,
    }));
  };

  const addInterviewer = () => {
    setValues((current) => ({
      ...current,
      interviewers: [
        ...current.interviewers,
        { id: makeInterviewerId(), name: '', email: '' },
      ],
    }));
    setErrors((current) => ({ ...current, interviewers: undefined }));
  };

  const removeInterviewer = (index) => {
    setValues((current) => {
      if (current.interviewers.length <= 1) return current;
      return {
        ...current,
        interviewers: current.interviewers.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
    setErrors({});
  };

  const handleSubmit = () => {
    const result = validateInterviewForm(values);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSubmit(buildInterviewPayload(values), interview?.interviewId);
  };

  const usedRounds = new Set(
    interviews
      .filter(
        (item) =>
          item.applicationId === values.applicationId &&
          item.status !== INTERVIEW_STATUS.CANCELLED &&
          item.interviewId !== interview?.interviewId
      )
      .map((item) => item.round)
  );
  const roundOptions = INTERVIEW_ROUNDS.filter(
    (round) => !usedRounds.has(round.value) || round.value === values.round
  );

  const assignedCount = values.interviewers.filter((item) =>
    item.name.trim()
  ).length;
  const typeMeta = getInterviewTypeMeta(assignedCount);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === 'reschedule'
          ? 'Reschedule interview'
          : mode === 'edit'
            ? 'Edit interview'
            : 'Schedule interview'
      }
      subtitle="Assign one or more interviewers; notifications are simulated in this demo"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {mode === 'create' ? 'Schedule interview' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field field--full">
          <Select
            label="Candidate"
            required
            value={values.applicationId}
            onChange={(event) =>
              handleCandidateChange(event.target.value)
            }
            error={errors.applicationId}
            placeholder="Select a shortlisted candidate"
            options={candidates.map((entry) => ({
              value: entry.application.applicationId,
              label: `${entry.candidate.fullName} · ${entry.job.title}`,
            }))}
            disabled={Boolean(interview)}
          />
        </div>

        <Select
          label="Interview round"
          required
          value={values.round}
          onChange={(event) => update('round', event.target.value)}
          error={errors.round}
          options={roundOptions}
        />

        <div className="ta-interviewer-type">
          <span className="detail-item__label">Interview type</span>
          <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
          <span className="field__hint">
            {assignedCount} interviewer{assignedCount === 1 ? '' : 's'} assigned
          </span>
        </div>

        <div className="field field--full ta-interviewer-section">
          <div className="ta-interviewer-section__header">
            <span className="field__label">
              Interviewers
              <span className="field__required" aria-hidden="true">
                *
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              onClick={addInterviewer}
              disabled={loading}
            >
              Add interviewer
            </Button>
          </div>

          <div className="ta-interviewer-list">
            {values.interviewers.map((interviewer, index) => (
              <div className="ta-interviewer-row" key={interviewer.id}>
                <Input
                  label={`Interviewer ${index + 1}`}
                  required
                  value={interviewer.name}
                  onChange={(event) =>
                    updateInterviewer(index, 'name', event.target.value)
                  }
                  error={errors[`interviewers.${index}.name`]}
                  placeholder="Full name"
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={interviewer.email}
                  onChange={(event) =>
                    updateInterviewer(index, 'email', event.target.value)
                  }
                  error={errors[`interviewers.${index}.email`]}
                  placeholder="name@company.com"
                />
                {values.interviewers.length > 1 ? (
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--icon ta-interviewer-row__remove"
                    onClick={() => removeInterviewer(index)}
                    aria-label={`Remove interviewer ${index + 1}`}
                    title="Remove interviewer"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <span
                    className="ta-interviewer-row__remove"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>

          {errors.interviewers && (
            <span className="field__error" role="alert">
              {errors.interviewers}
            </span>
          )}
          <span className="field__hint">
            Every interviewer is notified automatically after the interview is
            scheduled. Notifications are simulated and recorded in the mock
            email log.
          </span>
        </div>

        <Input
          label="Interview date"
          type="date"
          required
          value={values.scheduledDate}
          onChange={(event) => update('scheduledDate', event.target.value)}
          error={errors.scheduledDate}
        />

        <Input
          label="Interview time"
          type="time"
          required
          value={values.scheduledTime}
          onChange={(event) => update('scheduledTime', event.target.value)}
          error={errors.scheduledTime}
        />

        <Select
          label="Interview mode"
          required
          value={values.mode}
          onChange={(event) => handleModeChange(event.target.value)}
          error={errors.mode}
          options={INTERVIEW_MODES}
        />

        {values.mode === 'online' ? (
          <Input
            label="Meeting link"
            required
            value={values.meetingLink}
            onChange={(event) => update('meetingLink', event.target.value)}
            error={errors.meetingLink}
            placeholder="https://meet.example.com/room"
          />
        ) : (
          <Input
            label="Interview location"
            required
            value={values.location}
            onChange={(event) => update('location', event.target.value)}
            error={errors.location}
            placeholder="City · Room"
          />
        )}

        <div className="field field--full">
          <Textarea
            label="Interview notes"
            value={values.notes}
            onChange={(event) => update('notes', event.target.value)}
            placeholder="Focus areas for this round"
          />
        </div>
      </div>
    </Modal>
  );
}
