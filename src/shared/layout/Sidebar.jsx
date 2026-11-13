import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BadgeCheck,
  Briefcase,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileText,
  Mail,
  Send,
  ShieldCheck,
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
  const [talentOpen, setTalentOpen] = useState(true);

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

        <div className={`sidebar__group ${talentOpen ? 'open' : ''}`}>
          <button
            type="button"
            className="sidebar__group-toggle"
            onClick={() => setTalentOpen((current) => !current)}
            aria-expanded={talentOpen}
            aria-controls="talent-acquisition-navigation"
          >
            <Briefcase size={17} aria-hidden="true" />
            <span>Talent Acquisition</span>
            <ChevronDown className="sidebar__group-chevron" size={15} aria-hidden="true" />
          </button>

          <div
            id="talent-acquisition-navigation"
            className="sidebar__subnav"
            hidden={!talentOpen}
          >
            <NavItem
              to={ROUTES.TALENT_DASHBOARD}
              icon={BadgeCheck}
              label="Recruitment Dashboard"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_APPLICATIONS}
              icon={FileText}
              label="Candidate Applications"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_SCREENING}
              icon={ClipboardCheck}
              label="CV Screening"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_SHORTLISTING}
              icon={UsersRound}
              label="Shortlisting"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_INTERVIEWS}
              icon={Briefcase}
              label="Interviews"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_FINAL_SELECTION}
              icon={UserCheck}
              label="Final Selection"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_APPROVALS}
              icon={ShieldCheck}
              label="Admin Approval"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_OFFERS}
              icon={Send}
              label="Offer Management"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_JOINING}
              icon={BadgeCheck}
              label="Joining & Onboarding"
              onNavigate={onNavigate}
            />
            <NavItem
              to={ROUTES.TALENT_REPORTS}
              icon={FileText}
              label="Reports & Analytics"
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
