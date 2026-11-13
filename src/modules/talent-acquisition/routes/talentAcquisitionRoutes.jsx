import { Navigate, Outlet } from 'react-router-dom';
import { TalentAcquisitionProvider } from '../context/TalentAcquisitionContext.jsx';
import TalentAcquisitionDashboard from '../pages/TalentAcquisitionDashboard.jsx';
import CandidateApplicationsPage from '../pages/CandidateApplicationsPage.jsx';
import CandidateProfilePage from '../pages/CandidateProfilePage.jsx';
import CVScreeningPage from '../pages/CVScreeningPage.jsx';
import ShortlistingPage from '../pages/ShortlistingPage.jsx';
import InterviewManagementPage from '../pages/InterviewManagementPage.jsx';
import FinalSelectionPage from '../pages/FinalSelectionPage.jsx';
import ApprovalManagementPage from '../pages/ApprovalManagementPage.jsx';
import OfferManagementPage from '../pages/OfferManagementPage.jsx';
import JoiningOnboardingPage from '../pages/JoiningOnboardingPage.jsx';
import RecruitmentReportsPage from '../pages/RecruitmentReportsPage.jsx';
import { ROUTES } from '../../../app/routeConfig.js';

/**
 * Shared layout of the Talent Acquisition module. It provides the recruitment
 * state to every page and renders the page itself in the shared Outlet.
 */
export function TalentAcquisitionLayout() {
  return (
    <TalentAcquisitionProvider>
      <Outlet />
    </TalentAcquisitionProvider>
  );
}

/**
 * Routes of the Talent Acquisition module. They are registered inside the
 * shared MainLayout so the module inherits the Ecometrix shell.
 */
export const talentAcquisitionRoutes = [
  {
    path: ROUTES.TALENT_ACQUISITION,
    element: <TalentAcquisitionLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <TalentAcquisitionDashboard /> },
      { path: 'applications', element: <CandidateApplicationsPage /> },
      { path: 'screening', element: <CVScreeningPage /> },
      { path: 'shortlisting', element: <ShortlistingPage /> },
      { path: 'interviews', element: <InterviewManagementPage /> },
      { path: 'final-selection', element: <FinalSelectionPage /> },
      { path: 'approvals', element: <ApprovalManagementPage /> },
      { path: 'offers', element: <OfferManagementPage /> },
      { path: 'joining', element: <JoiningOnboardingPage /> },
      { path: 'reports', element: <RecruitmentReportsPage /> },
    ],
  },
  {
    path: ROUTES.TALENT_APPLICATION_PATTERN,
    element: (
      <TalentAcquisitionProvider>
        <CandidateProfilePage />
      </TalentAcquisitionProvider>
    ),
  },
];

export default talentAcquisitionRoutes;
