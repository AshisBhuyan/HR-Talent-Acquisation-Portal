import { Navigate } from 'react-router-dom';
import { DatabankProvider } from '../context/DatabankContext.jsx';
import EmployeeDatabankPage from '../pages/EmployeeDatabankPage.jsx';
import AllEmployeesPage from '../pages/AllEmployeesPage.jsx';
import CurrentEmployeesPage from '../pages/CurrentEmployeesPage.jsx';
import FormerEmployeesPage from '../pages/FormerEmployeesPage.jsx';
import InvitationsPage from '../pages/InvitationsPage.jsx';
import SubmissionsPage from '../pages/SubmissionsPage.jsx';
import EmployeeProfilePage from '../pages/EmployeeProfilePage.jsx';
import { ROUTES } from '../../../app/routeConfig.js';

export const employeeDatabankRoutes = [
  {
    path: ROUTES.DATABANK,
    element: (
      <DatabankProvider>
        <EmployeeDatabankPage />
      </DatabankProvider>
    ),
    children: [
      { index: true, element: <Navigate to="current" replace /> },
      { path: 'all', element: <AllEmployeesPage /> },
      { path: 'current', element: <CurrentEmployeesPage /> },
      { path: 'former', element: <FormerEmployeesPage /> },
      { path: 'invitations', element: <InvitationsPage /> },
      { path: 'submissions', element: <SubmissionsPage /> },
    ],
  },
  {
    path: ROUTES.EMPLOYEE_PROFILE_PATTERN,
    element: (
      <DatabankProvider>
        <EmployeeProfilePage />
      </DatabankProvider>
    ),
  },
];

export default employeeDatabankRoutes;
