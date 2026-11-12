import Badge from '../../../shared/components/Badge.jsx';
import { EMPLOYEE_STATUS_META } from '../constants/employeeStatus.js';

export default function EmployeeStatusBadge({ status }) {
  const meta = EMPLOYEE_STATUS_META[status] || EMPLOYEE_STATUS_META.current;
  return (
    <Badge variant={meta.variant} dot>
      {meta.shortLabel}
    </Badge>
  );
}
