import Badge from '../../../shared/components/Badge.jsx';
import {
  APPLICATION_STATUS_META,
  getApplicationStatusMeta,
} from '../constants/applicationStatus.js';
import { SCREENING_STATUS_META } from '../constants/screeningStatus.js';
import { INTERVIEW_STATUS_META } from '../constants/interviewStatus.js';
import { SELECTION_STATUS_META } from '../constants/selectionStatus.js';
import { APPROVAL_STATUS_META } from '../constants/approvalStatus.js';
import { OFFER_STATUS_META } from '../constants/offerStatus.js';
import { JOINING_STATUS_META } from '../constants/joiningStatus.js';

const DOMAIN_META = {
  application: APPLICATION_STATUS_META,
  screening: SCREENING_STATUS_META,
  interview: INTERVIEW_STATUS_META,
  selection: SELECTION_STATUS_META,
  approval: APPROVAL_STATUS_META,
  offer: OFFER_STATUS_META,
  joining: JOINING_STATUS_META,
};

/**
 * Renders a recruitment status badge. The domain determines which status
 * dictionary is used, so every status keeps its own meaning.
 */
export default function CandidateStatusBadge({ status, kind = 'application', dot = true }) {
  const meta = DOMAIN_META[kind]?.[status];

  if (!meta) {
    return (
      <Badge variant="grey" dot={dot}>
        {getApplicationStatusMeta(status).label}
      </Badge>
    );
  }

  return (
    <Badge variant={meta.variant} dot={dot}>
      {meta.label}
    </Badge>
  );
}
