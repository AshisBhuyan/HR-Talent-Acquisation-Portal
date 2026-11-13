import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  FileStack,
  Send,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { ROUTES } from '../../../app/routeConfig.js';

/**
 * Recruitment summary cards. Every value is derived from the Talent
 * Acquisition records.
 */
export default function RecruitmentStats({ stats }) {
  const navigate = useNavigate();

  const cards = [
    {
      key: 'total',
      label: 'Total Applications',
      value: stats.totalApplications,
      meta: 'Across all open positions',
      icon: FileStack,
      variant: 'blue',
      to: ROUTES.TALENT_APPLICATIONS,
    },
    {
      key: 'new',
      label: 'New Applications',
      value: stats.newApplications,
      meta: 'Awaiting screening',
      icon: UserPlus,
      variant: 'blue',
      to: ROUTES.TALENT_APPLICATIONS,
    },
    {
      key: 'screening',
      label: 'Under Screening',
      value: stats.underScreening,
      meta: 'CV screening in progress',
      icon: UsersRound,
      variant: 'orange',
      to: ROUTES.TALENT_SCREENING,
    },
    {
      key: 'shortlisted',
      label: 'Shortlisted',
      value: stats.shortlisted,
      meta: 'Ready for interview',
      icon: UserCheck,
      variant: 'purple',
      to: ROUTES.TALENT_SHORTLISTING,
    },
    {
      key: 'interviews',
      label: 'Upcoming Interviews',
      value: stats.upcomingInterviews,
      meta: 'Scheduled rounds ahead',
      icon: CalendarClock,
      variant: 'orange',
      to: ROUTES.TALENT_INTERVIEWS,
    },
    {
      key: 'selected',
      label: 'Selected',
      value: stats.selected,
      meta: 'Joined the organisation',
      icon: CheckCircle2,
      variant: 'green',
      to: ROUTES.TALENT_FINAL_SELECTION,
    },
    {
      key: 'approvals',
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      meta: 'Awaiting admin decision',
      icon: ShieldCheck,
      variant: 'orange',
      to: ROUTES.TALENT_APPROVALS,
    },
    {
      key: 'offers',
      label: 'Offers Sent',
      value: stats.offersSent,
      meta: 'Issued to candidates',
      icon: Send,
      variant: 'blue',
      to: ROUTES.TALENT_OFFERS,
    },
  ];

  return (
    <div className="stats-grid ta-stats-grid" aria-label="Recruitment statistics">
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
