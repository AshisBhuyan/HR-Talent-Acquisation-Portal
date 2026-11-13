import { daysAgo } from '../utils/formatDate.js';

/**
 * Reference data for open positions. In production this collection is served
 * by the career portal / job requisition API.
 */
export const jobReferenceData = [
  {
    jobId: 'JOB-1001',
    title: 'Senior Frontend Engineer',
    description: 'Build and maintain the Ecometrix design system and customer-facing portals using React and modern frontend tooling.', otherRequirements: ['Strong component architecture', 'Accessibility-first thinking', 'Experience with REST APIs'],
    department: 'Engineering',
    designation: 'Senior Frontend Engineer',
    location: 'Bengaluru · Hybrid',
    employmentType: 'Full-time',
    openings: 3,
    postedDate: daysAgo(46),
    status: 'open',
    requiredSkills: ['React', 'JavaScript', 'TypeScript', 'CSS Architecture', 'REST APIs'],
    minExperienceYears: 5,
    requiredQualification: 'Bachelor of Engineering',
    screeningBenchmark: 75,
  },
  {
    jobId: 'JOB-1002',
    title: 'Full Stack Developer',
    description: 'Deliver full stack features for the ordering and fulfilment platform across frontend and backend services.', otherRequirements: ['Production Node.js experience', 'Comfortable with Docker deployments', 'Clear written communication'],
    department: 'Engineering',
    designation: 'Full Stack Developer',
    location: 'Hyderabad · On-site',
    employmentType: 'Full-time',
    openings: 2,
    postedDate: daysAgo(38),
    status: 'open',
    requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'Git'],
    minExperienceYears: 3,
    requiredQualification: 'Bachelor of Technology',
    screeningBenchmark: 70,
  },
  {
    jobId: 'JOB-1003',
    title: 'HR Business Partner',
    description: 'Partner with business units on talent acquisition, employee relations and HR operations programs.', otherRequirements: ['SHRM or equivalent certification preferred', 'Strong stakeholder management', 'Comfortable with HRMS tooling'],
    department: 'Human Resources',
    designation: 'HR Business Partner',
    location: 'Pune · Hybrid',
    employmentType: 'Full-time',
    openings: 1,
    postedDate: daysAgo(29),
    status: 'open',
    requiredSkills: ['HR Operations', 'Talent Acquisition', 'Employee Relations', 'HRMS'],
    minExperienceYears: 4,
    requiredQualification: 'MBA (HR)',
    screeningBenchmark: 70,
  },
  {
    jobId: 'JOB-1004',
    title: 'Data Analyst',
    description: 'Build reporting and analytics solutions for finance and operations using SQL, Python and BI tooling.', otherRequirements: ['Financial reporting exposure preferred', 'Data storytelling skills', 'Excel power-user level'],
    department: 'Finance',
    designation: 'Data Analyst',
    location: 'Bengaluru · Hybrid',
    employmentType: 'Full-time',
    openings: 2,
    postedDate: daysAgo(24),
    status: 'open',
    requiredSkills: ['SQL', 'Power BI', 'Python', 'Excel', 'Data Modelling'],
    minExperienceYears: 2,
    requiredQualification: 'Bachelor of Statistics',
    screeningBenchmark: 68,
  },
  {
    jobId: 'JOB-1005',
    title: 'Product Designer',
    description: 'Design product experiences end to end, from user research through to shipped interfaces.', otherRequirements: ['Strong portfolio required', 'Design systems experience', 'Prototype-ready in Figma'],
    department: 'Design',
    designation: 'Product Designer',
    location: 'Remote · India',
    employmentType: 'Full-time',
    openings: 1,
    postedDate: daysAgo(18),
    status: 'open',
    requiredSkills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
    minExperienceYears: 3,
    requiredQualification: 'Bachelor of Design',
    screeningBenchmark: 70,
  },
  {
    jobId: 'JOB-1006',
    title: 'Trainee Software Engineer',
    description: 'Join the engineering graduate program and build production features under senior guidance.', otherRequirements: ['Strong academic record', 'Learning mindset', 'Team collaboration'],
    department: 'Engineering',
    designation: 'Trainee Software Engineer',
    location: 'Chennai · On-site',
    employmentType: 'Internship',
    openings: 4,
    postedDate: daysAgo(11),
    status: 'open',
    requiredSkills: ['JavaScript', 'React Basics', 'Git'],
    minExperienceYears: 0,
    requiredQualification: 'Bachelor of Technology',
    screeningBenchmark: 60,
  },
];

export function findJobById(jobId) {
  return jobReferenceData.find((job) => job.jobId === jobId) || null;
}

export function getJobTitle(jobId) {
  const job = findJobById(jobId);
  return job ? job.title : 'Unknown position';
}

export default jobReferenceData;
