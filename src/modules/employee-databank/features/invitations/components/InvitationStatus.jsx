import Badge from '../../../../../shared/components/Badge.jsx';
import { getInvitationStatusMeta } from '../../../constants/employeeStatus.js';

export default function InvitationStatus({ status }) {
  const meta = getInvitationStatusMeta(status);
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  );
}
