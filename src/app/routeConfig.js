export const ROUTES = {
  DATABANK: '/hr/employee-databank',
  ALL_EMPLOYEES: '/hr/employee-databank/all',
  CURRENT: '/hr/employee-databank/current',
  FORMER: '/hr/employee-databank/former',
  INVITATIONS: '/hr/employee-databank/invitations',
  SUBMISSIONS: '/hr/employee-databank/submissions',
  EMPLOYEE_PROFILE_PATTERN: '/hr/employee-databank/:employeeId',
  employeeProfile: (employeeId) => `/hr/employee-databank/${employeeId}`,
  INVITE_PATTERN: '/employee-invite/:token',
  invite: (token) => `/employee-invite/${token}`,

  /* -------------------------------------------------------------
     Talent Acquisition module
  ------------------------------------------------------------- */
  TALENT_ACQUISITION: '/hr/talent-acquisition',
  TALENT_DASHBOARD: '/hr/talent-acquisition/dashboard',
  TALENT_APPLICATIONS: '/hr/talent-acquisition/applications',
  TALENT_APPLICATION_PATTERN: '/hr/talent-acquisition/applications/:applicationId',
  TALENT_SCREENING: '/hr/talent-acquisition/screening',
  TALENT_SHORTLISTING: '/hr/talent-acquisition/shortlisting',
  TALENT_INTERVIEWS: '/hr/talent-acquisition/interviews',
  TALENT_FINAL_SELECTION: '/hr/talent-acquisition/final-selection',
  TALENT_APPROVALS: '/hr/talent-acquisition/approvals',
  TALENT_OFFERS: '/hr/talent-acquisition/offers',
  TALENT_JOINING: '/hr/talent-acquisition/joining',
  TALENT_REPORTS: '/hr/talent-acquisition/reports',
};

export const DATABANK_TABS = [
  { key: 'all', label: 'All Employees', to: 'all' },
  { key: 'current', label: 'Current Employees', to: 'current' },
  { key: 'former', label: 'Former Employees', to: 'former' },
  { key: 'invitations', label: 'Invitations', to: 'invitations' },
  { key: 'submissions', label: 'Submissions', to: 'submissions' },
];
