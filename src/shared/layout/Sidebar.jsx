import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronDown,
  Database,
  FileText,
  Mail,
  UserCheck,
  UserMinus,
  UsersRound,
} from 'lucide-react';
import EcometrixLogo from '../components/EcometrixLogo.jsx';
import { ROUTES } from '../../app/routeConfig.js';

function NavItem({ to, icon: Icon, label, end = false, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
    >
      <Icon size={17} aria-hidden="true" />
      <span className="sidebar__link-label">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open, onNavigate }) {
  const [databankOpen, setDatabankOpen] = useState(true);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <EcometrixLogo className="sidebar__logo-frame" />
        <div className="sidebar__brand-copy">
          <div className="sidebar__brand-name">Employee CV Management</div>
          <div className="sidebar__brand-sub">Ecometrix HR Portal</div>
        </div>
      </div>

      <div className="sidebar__scroll">
        <div className="sidebar__section-label">Workspace</div>

        <div className={`sidebar__group ${databankOpen ? 'open' : ''}`}>
          <button
            type="button"
            className="sidebar__group-toggle"
            onClick={() => setDatabankOpen((current) => !current)}
            aria-expanded={databankOpen}
            aria-controls="employee-databank-navigation"
          >
            <Database size={17} aria-hidden="true" />
            <span>Employee Databank</span>
            <ChevronDown className="sidebar__group-chevron" size={15} aria-hidden="true" />
          </button>

          <div
            id="employee-databank-navigation"
            className="sidebar__subnav"
            hidden={!databankOpen}
          >
            <NavItem
              to={ROUTES.ALL_EMPLOYEES}
              icon={UsersRound}
              label="All Employees"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.CURRENT}
              icon={UserCheck}
              label="Current Employees"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.FORMER}
              icon={UserMinus}
              label="Former Employees"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.INVITATIONS}
              icon={Mail}
              label="Invitations"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.SUBMISSIONS}
              icon={FileText}
              label="Submissions"
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="avatar avatar--sm">HR</div>
          <div>
            <div className="sidebar__user-name">HR Administrator</div>
            <div className="sidebar__user-role">Employee Databank owner</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
