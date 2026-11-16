import { INTERVIEW_MODES, INTERVIEW_ROUNDS } from '../../../constants/interviewStatus.js';
import { normalizeEmail } from '../utils/interviewers.js';

function isHttpUrl(value = '') {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getInterviewerDrafts(values = {}) {
  if (Array.isArray(values.interviewers) && values.interviewers.length > 0) {
    return values.interviewers;
  }
  return [{ name: values.interviewer || '', email: '' }];
}

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

  const interviewers = getInterviewerDrafts(values);
  if (interviewers.length === 0) {
    errors.interviewers = 'Add at least one interviewer.';
  }

  const emails = new Map();
  interviewers.forEach((interviewer, index) => {
    if (!interviewer?.name?.trim()) {
      errors[`interviewers.${index}.name`] = 'Enter the interviewer name.';
    }
    if (!interviewer?.email?.trim()) {
      errors[`interviewers.${index}.email`] = 'Enter the interviewer email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(interviewer.email.trim())) {
      errors[`interviewers.${index}.email`] = 'Enter a valid email address.';
    } else {
      const key = normalizeEmail(interviewer.email);
      if (!emails.has(key)) emails.set(key, []);
      emails.get(key).push(index);
    }
  });

  emails.forEach((indexes) => {
    if (indexes.length < 2) return;
    indexes.forEach((index) => {
      errors[`interviewers.${index}.email`] =
        'This email is used by another interviewer.';
    });
  });

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

  if (values.mode === 'online') {
    if (!values.meetingLink?.trim()) {
      errors.meetingLink = 'Add the meeting link for an online interview.';
    } else if (!isHttpUrl(values.meetingLink)) {
      errors.meetingLink = 'Enter a valid http(s) meeting link.';
    }
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
  const interviewers = getInterviewerDrafts(values)
    .map((interviewer, index) => ({
      ...(interviewer?.id ? { id: interviewer.id } : { id: `draft-${index + 1}` }),
      name: String(interviewer?.name || '').trim(),
      email: String(interviewer?.email || '').trim(),
    }))
    .filter((interviewer) => interviewer.name || interviewer.email);

  return {
    applicationId: values.applicationId,
    round: values.round,
    interviewer: interviewers
      .map((interviewer) => interviewer.name)
      .filter(Boolean)
      .join(', '),
    interviewers,
    scheduledAt: `${values.scheduledDate}T${values.scheduledTime}`,
    mode: values.mode,
    meetingLink: values.mode === 'online' ? values.meetingLink : '',
    location: values.mode === 'offline' ? values.location : '',
    notes: values.notes,
  };
}
