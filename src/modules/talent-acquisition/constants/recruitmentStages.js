import { APPLICATION_STATUS } from './applicationStatus.js';

/**
 * The ordered recruitment pipeline. Every stage maps to one application
 * status so the pipeline visualisation and the filters stay in sync with the
 * underlying records.
 */
export const RECRUITMENT_STAGES = [
  {
    key: APPLICATION_STATUS.APPLIED,
    label: 'Applied',
    description: 'Applications received from the Career Portal',
  },
  {
    key: APPLICATION_STATUS.UNDER_SCREENING,
    label: 'Screening',
    description: 'CV screening in progress',
  },
  {
    key: APPLICATION_STATUS.SHORTLISTED,
    label: 'Shortlisted',
    description: 'Screened and shortlisted by HR',
  },
  {
    key: APPLICATION_STATUS.INTERVIEW,
    label: 'Interview',
    description: 'Interview rounds in progress',
  },
  {
    key: APPLICATION_STATUS.FINAL_SELECTION,
    label: 'Final Selection',
    description: 'HR decision on the interviewed candidate',
  },
  {
    key: APPLICATION_STATUS.APPROVAL,
    label: 'Approval',
    description: 'Hiring recommendation awaiting admin approval',
  },
  {
    key: APPLICATION_STATUS.OFFER,
    label: 'Offer',
    description: 'Offer drafted and issued',
  },
  {
    key: APPLICATION_STATUS.JOINING,
    label: 'Joining',
    description: 'Joining and onboarding progress',
  },
];

export const RECRUITMENT_STAGE_KEYS = RECRUITMENT_STAGES.map((stage) => stage.key);

export const RECRUITMENT_STAGE_OPTIONS = RECRUITMENT_STAGES.map((stage) => ({
  value: stage.key,
  label: stage.label,
}));

export function getStageLabel(stageKey) {
  const stage = RECRUITMENT_STAGES.find((item) => item.key === stageKey);
  return stage ? stage.label : 'Unknown';
}

export function getStageIndex(stageKey) {
  return RECRUITMENT_STAGE_KEYS.indexOf(stageKey);
}
