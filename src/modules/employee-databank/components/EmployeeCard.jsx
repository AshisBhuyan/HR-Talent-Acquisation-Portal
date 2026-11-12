import { CalendarDays, Eye, FileText, Mail, Pencil, Trash2 } from 'lucide-react';
import Badge from '../../../shared/components/Badge.jsx';
import EmployeeStatusBadge from './EmployeeStatusBadge.jsx';
import { formatDate } from '../utils/formatDate.js';
import { getInitials } from '../utils/formatEmployeeData.js';

export default function EmployeeCard({ employee, onView, onEdit, onDelete }) {
  return (
    <article className="employee-card">
      <div className="employee-card__top">
        <div className="avatar avatar--lg">
          {employee.profilePhoto ? (
            <img src={employee.profilePhoto} alt="" />
          ) : (
            getInitials(employee.fullName)
          )}
        </div>
        <div className="employee-card__identity">
          <h3 className="employee-card__name">{employee.fullName}</h3>
          <p className="employee-card__role">{employee.designation}</p>
          <p className="employee-card__dept">{employee.department}</p>
        </div>
        <EmployeeStatusBadge status={employee.status} />
      </div>

      <div className="employee-card__meta">
        <span className="employee-card__meta-item">
          <Mail size={14} aria-hidden="true" />
          {employee.email}
        </span>
        <span className="employee-card__meta-item">
          <CalendarDays size={14} aria-hidden="true" />
          Joined {formatDate(employee.joiningDate)}
        </span>
        <span className="employee-card__meta-item">
          <FileText size={14} aria-hidden="true" />
          {employee.cv ? 'CV attached' : 'No CV on file'}
          <Badge variant={employee.cv ? 'green' : 'grey'}>
            {employee.cv ? 'Ready' : 'Missing'}
          </Badge>
        </span>
      </div>

      <div className="employee-card__footer">
        <span className="cell-muted">{employee.employeeId}</span>
        <div className="cell-actions">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => onView(employee)}
            aria-label={`View ${employee.fullName}`}
            title="View profile"
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => onEdit(employee)}
            aria-label={`Edit ${employee.fullName}`}
            title="Edit employee"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="btn btn--danger-ghost btn--icon"
            onClick={() => onDelete(employee)}
            aria-label={`Delete ${employee.fullName}`}
            title="Delete employee"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
