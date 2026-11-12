import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = '',
  action = null,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon size={24} aria-hidden="true" />
      </div>
      <div className="empty-state__title">{title}</div>
      {description && <p className="empty-state__text">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
