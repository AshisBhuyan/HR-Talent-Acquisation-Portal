import { createBrowserRouter, Link, Navigate } from 'react-router-dom';
import MainLayout from '../shared/layout/MainLayout.jsx';
import EmployeeOnboardingPage from '../modules/employee-databank/pages/EmployeeOnboardingPage.jsx';
import { employeeDatabankRoutes } from '../modules/employee-databank/routes/employeeDatabankRoutes.jsx';
import { talentAcquisitionRoutes } from '../modules/talent-acquisition/routes/talentAcquisitionRoutes.jsx';
import CandidateOfferResponsePage from '../modules/talent-acquisition/pages/CandidateOfferResponsePage.jsx';
import CandidateDocumentSubmissionPage from '../modules/talent-acquisition/pages/CandidateDocumentSubmissionPage.jsx';
import { ROUTES } from './routeConfig.js';

function NotFoundPage() {
  return (
    <div className="app-content">
      <div className="card">
        <div className="empty-state">
          <div className="empty-state__icon">
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>404</span>
          </div>
          <div className="empty-state__title">Page not found</div>
          <p className="empty-state__text">
            The page you requested is not part of the Employee CV Management module.
          </p>
          <div className="empty-state__action">
            <Link className="btn btn--primary" to={ROUTES.CURRENT}>
              Go to Employee Databank
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={ROUTES.CURRENT} replace />,
  },
  {
    element: <MainLayout />,
    children: [...employeeDatabankRoutes, ...talentAcquisitionRoutes],
  },
  {
    path: ROUTES.INVITE_PATTERN,
    element: <EmployeeOnboardingPage />,
  },
  {
    path: ROUTES.CANDIDATE_OFFER_RESPONSE_PATTERN,
    element: <CandidateOfferResponsePage />,
  },
  {
    path: ROUTES.CANDIDATE_DOCUMENT_SUBMISSION_PATTERN,
    element: <CandidateDocumentSubmissionPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
