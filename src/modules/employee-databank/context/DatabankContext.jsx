import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import employeeService from '../features/employees/services/employeeService.js';
import formerEmployeeService from '../features/former-employees/services/formerEmployeeService.js';
import invitationService from '../features/invitations/services/invitationService.js';
import submissionService from '../features/submissions/services/submissionService.js';
import { INVITATION_STATUS, SUBMISSION_STATUS } from '../constants/employeeStatus.js';

const DatabankContext = createContext(null);

export function DatabankProvider({ children }) {
  const [state, setState] = useState({
    employees: [],
    formerEmployees: [],
    invitations: [],
    submissions: [],
    loading: true,
    error: '',
  });

  const loadAll = useCallback(async (showLoading) => {
    if (showLoading) {
      setState((current) => ({ ...current, loading: true, error: '' }));
    }

    try {
      const [employees, formerEmployees, invitations, submissions] = await Promise.all([
        employeeService.getEmployees(),
        formerEmployeeService.getFormerEmployees(),
        invitationService.getInvitations(),
        submissionService.getSubmissions(),
      ]);

      setState({
        employees,
        formerEmployees,
        invitations,
        submissions,
        loading: false,
        error: '',
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Unable to load employee databank data.',
      }));
    }
  }, []);

  useEffect(() => {
    loadAll(true);
  }, [loadAll]);

  const refresh = useCallback(() => loadAll(false), [loadAll]);

  const stats = useMemo(() => {
    const pendingInvitations = state.invitations.filter((invitation) =>
      [
        INVITATION_STATUS.PENDING,
        INVITATION_STATUS.IN_PROGRESS,
      ].includes(invitation.status)
    ).length;

    const pendingSubmissions = state.submissions.filter(
      (submission) => submission.status === SUBMISSION_STATUS.PENDING
    ).length;

    return {
      totalEmployees: state.employees.length + state.formerEmployees.length,
      currentEmployees: state.employees.length,
      formerEmployees: state.formerEmployees.length,
      pendingInvitations,
      pendingSubmissions,
      totalInvitations: state.invitations.length,
      totalSubmissions: state.submissions.length,
    };
  }, [state.employees, state.formerEmployees, state.invitations, state.submissions]);

  const value = useMemo(
    () => ({ ...state, stats, refresh }),
    [state, stats, refresh]
  );

  return <DatabankContext.Provider value={value}>{children}</DatabankContext.Provider>;
}

export function useDatabank() {
  const context = useContext(DatabankContext);
  if (!context) {
    throw new Error('useDatabank must be used inside a DatabankProvider');
  }
  return context;
}
