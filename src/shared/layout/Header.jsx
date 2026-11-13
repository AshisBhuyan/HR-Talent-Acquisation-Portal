import { Bell, ChevronRight, HelpCircle, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast.jsx';

const SECTION_LABELS = {
  all: 'All Employees',
  current: 'Current Employees',
  former: 'Former Employees',
  invitations: 'Invitations',
  submissions: 'Submissions',
};

const TALENT_SECTION_LABELS = {
  dashboard: 'Recruitment Dashboard',
  applications: 'Candidate Applications',
  screening: 'CV Screening',
  shortlisting: 'Shortlisting',
  interviews: 'Interviews',
  'final-selection': 'Final Selection',
  approvals: 'Admin Approval',
  offers: 'Offer Management',
  joining: 'Joining & Onboarding',
  reports: 'Reports & Analytics',
};

function getSectionLabel(pathname) {
  if (pathname === '/hr/employee-databank') return 'Overview';

  if (pathname.startsWith('/hr/talent-acquisition')) {
    const segment = pathname.split('/').filter(Boolean).pop();
    return TALENT_SECTION_LABELS[segment] || 'Talent Acquisition';
  }

  const segment = pathname.split('/').filter(Boolean).pop();
  return SECTION_LABELS[segment] || 'Employee Profile';
}

export default function Header({ onMenuClick }) {
  const toast = useToast();
  const location = useLocation();
  const sectionLabel = getSectionLabel(location.pathname);

  return (
    <header className="app-header">
      <button
        type="button"
        className="app-header__icon-btn mobile-toggle"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu size={19} />
      </button>

      <nav className="app-header__breadcrumb" aria-label="Breadcrumb">
        <span>Ecometrix</span>
        <ChevronRight size={13} aria-hidden="true" />
        <span>
          {location.pathname.startsWith('/hr/talent-acquisition')
            ? 'Talent Acquisition'
            : 'Employee CV Management'}
        </span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>{sectionLabel}</strong>
      </nav>

      <div className="app-header__spacer" />

      <div className="app-header__actions">
        <button
          type="button"
          className="app-header__icon-btn"
          aria-label="Help"
          onClick={() =>
            toast.info('Help & Support is provided by the main HR portal module.')
          }
        >
          <HelpCircle size={18} />
        </button>
        <button
          type="button"
          className="app-header__icon-btn"
          aria-label="Notifications"
          onClick={() =>
            toast.info('Notifications are provided by the main HR portal module.')
          }
        >
          <Bell size={18} />
          <span className="app-header__dot" />
        </button>
        <div className="app-header__divider" />
        <div className="app-header__profile" title="HR Administrator">
          <div className="avatar">HR</div>
          <div className="app-header__profile-text">
            <span className="app-header__profile-name">HR Administrator</span>
            <span className="app-header__profile-role">Databank owner</span>
          </div>
        </div>
      </div>
    </header>
  );
}
