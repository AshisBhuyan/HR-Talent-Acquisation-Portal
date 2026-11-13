import {
  BadgeCheck,
  ClipboardList,
  FileText,
  ShieldCheck,
  Send,
  UserCheck,
  UsersRound,
} from 'lucide-react';

/**
 * Joining summary cards. Every value is derived from the stored joining
 * records.
 */
export default function JoiningSummaryCards({ summary }) {
  const cards = [
    { key: 'total', label: 'Total Joining Candidates', value: summary.total, meta: 'Accepted offers', icon: UsersRound, variant: 'blue' },
    { key: 'pending', label: 'Pending Documents', value: summary.pendingDocuments, meta: 'Mandatory documents not verified', icon: FileText, variant: 'orange' },
    { key: 'verification', label: 'Verification In Progress', value: summary.verificationInProgress, meta: 'Documents under review', icon: ShieldCheck, variant: 'blue' },
    { key: 'ready', label: 'Ready to Join', value: summary.readyToJoin, meta: 'All requirements satisfied', icon: BadgeCheck, variant: 'green' },
    { key: 'joined', label: 'Successfully Joined', value: summary.joined, meta: 'Employees that joined', icon: UserCheck, variant: 'green' },
    { key: 'handover', label: 'Pending Employee Handover', value: summary.pendingHandover, meta: 'Joined, awaiting databank import', icon: ClipboardList, variant: 'orange' },
    { key: 'imported', label: 'Successfully Imported', value: summary.imported, meta: 'Current employees in the databank', icon: Send, variant: 'green' },
  ];

  return (
    <div className="stats-grid ta-joining-stats" aria-label="Joining statistics">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div className={`stat-card stat-card--${card.variant}`} key={card.key}>
            <div className={`stat-card__icon stat-card__icon--${card.variant}`}>
              <Icon size={20} aria-hidden="true" />
            </div>
            <div className="stat-card__content">
              <div className="stat-card__label">{card.label}</div>
              <div className="stat-card__value">{card.value}</div>
              <div className="stat-card__meta">{card.meta}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
