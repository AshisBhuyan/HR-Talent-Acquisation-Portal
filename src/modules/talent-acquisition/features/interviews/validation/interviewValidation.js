import { INTERVIEW_MODES, INTERVIEW_ROUNDS } from '../../../constants/interviewStatus.js';

/**
 * Validation for the interview scheduling form. The rules mirror the service
 * guard rails so an invalid schedule can never reach the record layer.
 */
export function validateInterviewForm(values = {}) {
  const errors = {};

  if (!values.applicationId) {
    errors.applicationId = 'Select the candidate to be interviewed.';
  }

  if (!values.round) {
    errors.round = 'Select the interview round.';
  } else if (!INTERVIEW_ROUNDS.some((round) => round.value === values.round)) {
    errors.round = 'Select a valid interview round.';
  }

  if (!values.interviewer?.trim()) {
    errors.interviewer = 'Enter the interviewer name.';
  }

  if (!values.scheduledDate) {
    errors.scheduledDate = 'Select the interview date.';
  }

  if (!values.scheduledTime) {
    errors.scheduledTime = 'Select the interview time.';
  }

  if (values.scheduledDate && values.scheduledTime) {
    const combined = new Date(`${values.scheduledDate}T${values.scheduledTime}`);
    if (Number.isNaN(combined.getTime())) {
      errors.scheduledTime = 'Enter a valid date and time.';
    } else if (combined.getTime() < Date.now() - 60000) {
      errors.scheduledDate = 'The interview time must be in the future.';
    }
  }

  if (!values.mode) {
    errors.mode = 'Select the interview mode.';
  } else if (!INTERVIEW_MODES.some((mode) => mode.value === values.mode)) {
    errors.mode = 'Select a valid interview mode.';
  }

  if (values.mode === 'online' && !values.meetingLink?.trim()) {
    errors.meetingLink = 'Add the meeting link for an online interview.';
  }

  if (values.mode === 'offline' && !values.location?.trim()) {
    errors.location = 'Add the interview location for an offline interview.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateFeedbackForm(values = {}) {
  const errors = {};

  const ratings = [
    ['technicalKnowledge', 'Rate the technical knowledge.'],
    ['communicationSkills', 'Rate the communication skills.'],
    ['problemSolving', 'Rate the problem-solving ability.'],
    ['overallRating', 'Give an overall rating.'],
  ];

  ratings.forEach(([key, message]) => {
    const value = Number(values[key]);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      errors[key] = message;
    }
  });

  if (!values.remarks?.trim()) {
    errors.remarks = 'Record the interview remarks.';
  }

  if (!values.recommendation) {
    errors.recommendation = 'Select a final recommendation.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function buildInterviewPayload(values = {}) {
  return {
    applicationId: values.applicationId,
    round: values.round,
    interviewer: values.interviewer,
    scheduledAt: `${values.scheduledDate}T${values.scheduledTime}`,
    mode: values.mode,
    meetingLink: values.meetingLink,
    location: values.location,
    notes: values.notes,
  };
}
