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
};

export const DATABANK_TABS = [
  { key: 'all', label: 'All Employees', to: 'all' },
  { key: 'current', label: 'Current Employees', to: 'current' },
  { key: 'former', label: 'Former Employees', to: 'former' },
  { key: 'invitations', label: 'Invitations', to: 'invitations' },
  { key: 'submissions', label: 'Submissions', to: 'submissions' },
];
