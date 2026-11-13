import { useEffect, useState } from 'react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import { Input, Select, Textarea } from '../../../../../shared/components/Input.jsx';
import {
  buildInterviewPayload,
  validateInterviewForm,
} from '../validation/interviewValidation.js';
import { INTERVIEW_MODES, INTERVIEW_ROUNDS } from '../../../constants/interviewStatus.js';

const EMPTY_FORM = {
  applicationId: '',
  round: 'hr',
  interviewer: '',
  scheduledDate: '',
  scheduledTime: '',
  mode: 'online',
  meetingLink: '',
  location: '',
  notes: '',
};

/**
 * Schedules or reschedules an interview round.
 */
export default function InterviewScheduleModal({
  open,
  interview,
  mode = 'create',
  candidates,
  onClose,
  onSubmit,
  loading,
}) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    if (interview) {
      const date = new Date(interview.scheduledAt);
      setValues({
        applicationId: interview.applicationId,
        round: interview.round,
        interviewer: interview.interviewer,
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
      setValues(EMPTY_FORM);
    }
    setErrors({});
  }, [open, interview]);

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = () => {
    const result = validateInterviewForm(values);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSubmit(buildInterviewPayload(values), interview?.interviewId);
  };

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
      subtitle="Interview rounds are validated before they are saved"
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
            onChange={(event) => update('applicationId', event.target.value)}
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
          options={INTERVIEW_ROUNDS}
        />

        <Input
          label="Interviewer"
          required
          value={values.interviewer}
          onChange={(event) => update('interviewer', event.target.value)}
          error={errors.interviewer}
          placeholder="Name of the interviewer"
        />

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
          onChange={(event) => update('mode', event.target.value)}
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
