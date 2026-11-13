/**
 * Experience matching helpers. The module never invents an AI score; it only
 * compares the experience stated in the candidate record with the experience
 * required by the position.
 */

export function totalExperienceFromHistory(experience = []) {
  if (!Array.isArray(experience) || experience.length === 0) return 0;

  return experience.reduce((total, role) => {
    const from = Number.parseInt(role.from, 10);
    const to = role.to && role.to.toLowerCase() !== 'present'
      ? Number.parseInt(role.to, 10)
      : new Date().getFullYear();
    if (!Number.isFinite(from) || !Number.isFinite(to)) return total;
    return total + Math.max(0, to - from);
  }, 0);
}

export function getCandidateExperience(candidate) {
  if (!candidate) return 0;
  if (Number.isFinite(Number(candidate.totalExperienceYears))) {
    return Number(candidate.totalExperienceYears);
  }
  return totalExperienceFromHistory(candidate.experience);
}

export function getExperienceGap(candidateExperienceYears, requiredExperienceYears) {
  const candidate = Number(candidateExperienceYears) || 0;
  const required = Number(requiredExperienceYears) || 0;
  return candidate - required;
}

export function getExperienceMatchLabel(candidate, job) {
  const candidateYears = getCandidateExperience(candidate);
  const requiredYears = Number(job?.minExperienceYears) || 0;
  const gap = getExperienceGap(candidateYears, requiredYears);

  if (requiredYears === 0) {
    return { label: 'No prior experience required', state: 'neutral', gap };
  }
  if (gap >= 0) {
    return {
      label: `${candidateYears} yrs against ${requiredYears} yrs required`,
      state: 'met',
      gap,
    };
  }
  return {
    label: `${candidateYears} yrs against ${requiredYears} yrs required`,
    state: 'short',
    gap,
  };
}

/**
 * Percentage of the required skills that the candidate has listed.
 */
export function getSkillsMatch(requiredSkills = [], candidateSkills = []) {
  const required = Array.isArray(requiredSkills) ? requiredSkills : [];
  const owned = Array.isArray(candidateSkills) ? candidateSkills : [];

  const normalizedOwned = owned.map((skill) => String(skill).toLowerCase().trim());
  const matched = required.filter((skill) =>
    normalizedOwned.includes(String(skill).toLowerCase().trim())
  );
  const missing = required.filter(
    (skill) => !normalizedOwned.includes(String(skill).toLowerCase().trim())
  );

  const percentage = required.length === 0 ? 100 : Math.round((matched.length / required.length) * 100);

  return { matched, missing, percentage, requiredCount: required.length };
}

/**
 * Compares the highest qualification of the candidate with the requirement
 * of the position.
 */
export function getEducationMatch(candidate, job) {
  const required = job?.requiredQualification || '';
  const qualifications = Array.isArray(candidate?.education)
    ? candidate.education.map((item) => item.qualification || '').filter(Boolean)
    : [];

  if (!required) {
    return { state: 'neutral', label: 'No qualification requirement', qualifications };
  }

  const match = qualifications.some((qualification) =>
    qualification.toLowerCase().includes(required.split(' ')[0].toLowerCase())
  );

  return {
    state: match ? 'met' : 'review',
    label: match
      ? `Meets ${required}`
      : `Confirm against ${required}`,
    qualifications,
  };
}
