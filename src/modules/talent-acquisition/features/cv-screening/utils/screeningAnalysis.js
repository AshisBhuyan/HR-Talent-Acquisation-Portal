import { getEducationMatch, getExperienceMatchLabel, getSkillsMatch } from '../../../utils/calculateExperience.js';

/**
 * Builds the screening comparison for a candidate and a position. The module
 * compares the data of the application; it never invents an AI assessment.
 */
export function buildScreeningAnalysis(candidate, job) {
  const skills = getSkillsMatch(job?.requiredSkills || [], candidate?.skills || []);
  const experience = getExperienceMatchLabel(candidate, job);
  const education = getEducationMatch(candidate, job);

  const experienceScore =
    experience.gap >= 0 ? 100 : Math.max(0, Math.round((experience.gap / Math.max(1, job?.minExperienceYears || 1)) * 100));
  const educationScore = education.state === 'met' ? 100 : education.state === 'neutral' ? 80 : 50;

  return {
    skills,
    experience,
    education,
    scores: {
      skills: skills.percentage,
      experience: experienceScore,
      education: educationScore,
    },
  };
}

export function getScreeningOutcomeLabel(screening) {
  if (!screening) return 'Not screened';
  if (screening.status === 'passed') return 'Screening passed';
  if (screening.status === 'failed') return 'Screening failed';
  if (screening.status === 'in_progress') return 'Screening in progress';
  return 'Screening pending';
}
