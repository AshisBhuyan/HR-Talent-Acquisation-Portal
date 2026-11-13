import { daysAgo, daysAhead } from '../utils/formatDate.js';

/**
 * Activity feed used by the dashboard. New entries are appended by the
 * services when a workflow transition happens.
 */
export const recruitmentActivityMockData = [
  {
    id: 'ACT-0001',
    type: 'application',
    applicationId: 'APP-0012',
    candidateId: 'CAND-0012',
    message: 'Karthik Subramanian applied for Trainee Software Engineer',
    at: daysAgo(1),
  },
  {
    id: 'ACT-0002',
    type: 'interview',
    applicationId: 'APP-0007',
    candidateId: 'CAND-0007',
    message: 'Final round feedback submitted for Meera Joshi',
    at: daysAgo(2),
  },
  {
    id: 'ACT-0003',
    type: 'application',
    applicationId: 'APP-0011',
    candidateId: 'CAND-0011',
    message: 'Tanvi Bhatt applied for Product Designer',
    at: daysAgo(2),
  },
  {
    id: 'ACT-0004',
    type: 'offer',
    applicationId: 'APP-0018',
    candidateId: 'CAND-0016',
    message: 'Offer sent to Lakshmi Prasad',
    at: daysAgo(9),
  },
  {
    id: 'ACT-0005',
    type: 'approval',
    applicationId: 'APP-0017',
    candidateId: 'CAND-0015',
    message: 'Hiring recommendation for Sanjeev Kapoor is awaiting approval',
    at: daysAgo(17),
  },
  {
    id: 'ACT-0006',
    type: 'joining',
    applicationId: 'APP-0020',
    candidateId: 'CAND-0018',
    message: 'Ritu Chandra joined and was handed over to the Employee Databank',
    at: daysAgo(28),
  },
  {
    id: 'ACT-0007',
    type: 'screening',
    applicationId: 'APP-0015',
    candidateId: 'CAND-0013',
    message: 'CV screening passed for Neha Saxena',
    at: daysAgo(20),
  },
  {
    id: 'ACT-0008',
    type: 'interview',
    applicationId: 'APP-0015',
    candidateId: 'CAND-0013',
    message: 'Technical round scheduled for Neha Saxena',
    at: daysAhead(3, 11, 0),
  },
];

/**
 * Reference figures shown next to the derived recruitment statistics. They
 * describe the seeded demo dataset, not a live reporting service.
 */
export const recruitmentMetricsMockData = {
  label: 'Demonstration data',
  note: 'All figures are derived from the seeded Talent Acquisition records in this browser.',
  sourceChannelMix: [
    { source: 'Career Portal', weight: 0.62 },
    { source: 'Employee Referral', weight: 0.18 },
    { source: 'LinkedIn', weight: 0.12 },
    { source: 'Job Portal', weight: 0.08 },
  ],
  hiringSummary: {
    averageTimeToShortlistDays: 6,
    averageTimeToInterviewDays: 11,
    averageTimeToOfferDays: 19,
    averageTimeToJoinDays: 27,
  },
};

export default recruitmentActivityMockData;
