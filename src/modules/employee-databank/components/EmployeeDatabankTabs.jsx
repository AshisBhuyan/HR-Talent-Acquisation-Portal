import { NavLink } from 'react-router-dom';
import { DATABANK_TABS } from '../../../app/routeConfig.js';

export default function EmployeeDatabankTabs({ counts = {} }) {
  return (
    <nav className="tabs" aria-label="Employee databank sections">
      {DATABANK_TABS.map((tab) => {
        const count = counts[tab.key];
        const isAlert = ['invitations', 'submissions'].includes(tab.key) && count > 0;

        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
          >
            {tab.label}
            {typeof count === 'number' && (
              <span className={`tab__count ${isAlert ? 'tab__count--alert' : ''}`}>{count}</span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
