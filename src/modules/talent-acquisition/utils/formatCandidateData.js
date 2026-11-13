/**
 * Presentation helpers for candidate records. No business rule lives here.
 */

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getCandidateDisplayName(candidate) {
  if (!candidate) return 'Unknown candidate';
  return candidate.fullName || candidate.email || 'Unknown candidate';
}

export function formatSalary(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Not specified';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatExperienceYears(value) {
  if (value === null || value === undefined) return 'Not specified';
  const years = Number(value);
  if (!Number.isFinite(years) || years < 0) return 'Not specified';

  if (years === 0) return 'Fresher';
  if (Number.isInteger(years) || Number.isInteger(Number(years.toFixed(1)))) {
    const whole = Math.round(years);
    return `${whole} year${whole === 1 ? '' : 's'}`;
  }

  return `${Math.round(years * 10) / 10} years`;
}

export function formatSkillList(skills = [], limit = 0) {
  const list = Array.isArray(skills) ? skills.filter(Boolean) : [];
  if (list.length === 0) return 'Not provided';
  if (!limit || list.length <= limit) return list.join(', ');
  return `${list.slice(0, limit).join(', ')} +${list.length - limit} more`;
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`;
}

/**
 * Builds the flat application row used by tables and list views.
 */
export function buildApplicationRow(application, { candidate, job } = {}) {
  return {
    ...application,
    candidateName: getCandidateDisplayName(candidate),
    candidateEmail: candidate?.email || '',
    candidatePhone: candidate?.phone || '',
    candidateLocation: candidate?.location || '',
    candidateExperienceYears: candidate?.totalExperienceYears ?? null,
    candidateSkills: candidate?.skills || [],
    candidateHasCv: Boolean(
      Array.isArray(candidate?.documents) &&
        candidate.documents.some((document) => document.type === 'cv')
    ),
    jobTitle: job?.title || 'Unknown position',
    jobDepartment: job?.department || '',
    jobLocation: job?.location || '',
    requiredSkills: job?.requiredSkills || [],
    requiredExperienceYears: job?.minExperienceYears ?? 0,
    requiredQualification: job?.requiredQualification || '',
  };
}

export function buildTimelineRows(application) {
  const timeline = Array.isArray(application?.timeline) ? application.timeline : [];
  return [...timeline].sort(
    (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()
  );
}
