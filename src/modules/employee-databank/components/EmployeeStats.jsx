import { useNavigate } from 'react-router-dom';
import { FileText, Mail, UserCheck, UserMinus, UsersRound } from 'lucide-react';
import { ROUTES } from '../../../app/routeConfig.js';

export default function EmployeeStats({ stats }) {
  const navigate = useNavigate();

  const cards = [
    {
      key: 'total',
      label: 'Total Employees',
      value: stats.totalEmployees,
      meta: 'Current + former records',
      icon: UsersRound,
      variant: 'green',
      to: ROUTES.CURRENT,
    },
    {
      key: 'current',
      label: 'Current Employees',
      value: stats.currentEmployees,
      meta: 'Active databank records',
      icon: UserCheck,
      variant: 'green',
      to: ROUTES.CURRENT,
    },
    {
      key: 'former',
      label: 'Former Employees',
      value: stats.formerEmployees,
      meta: 'Separate historical records',
      icon: UserMinus,
      variant: 'grey',
      to: ROUTES.FORMER,
    },
    {
      key: 'invitations',
      label: 'Pending Invitations',
      value: stats.pendingInvitations,
      meta: `${stats.totalInvitations} total invitations`,
      icon: Mail,
      variant: 'orange',
      to: ROUTES.INVITATIONS,
    },
    {
      key: 'submissions',
      label: 'Submissions',
      value: stats.totalSubmissions,
      meta: `${stats.pendingSubmissions} awaiting validation`,
      icon: FileText,
      variant: 'orange',
      to: ROUTES.SUBMISSIONS,
    },
  ];

  return (
    <div className="stats-grid" aria-label="Employee statistics">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            type="button"
            className={`stat-card stat-card--${card.variant}`}
            key={card.key}
            onClick={() => navigate(card.to)}
            aria-label={`View ${card.label}`}
          >
            <div className={`stat-card__icon stat-card__icon--${card.variant}`}>
              <Icon size={20} aria-hidden="true" />
            </div>
            <div className="stat-card__content">
              <div className="stat-card__label">{card.label}</div>
              <div className="stat-card__value">{card.value}</div>
              <div className="stat-card__meta">{card.meta}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
