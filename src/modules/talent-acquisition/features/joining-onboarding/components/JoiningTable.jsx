import { Eye, FileText, Send, UserCheck } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import CandidateStatusBadge from '../../../components/CandidateStatusBadge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { formatDate } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatCandidateData.js';
import { getOfferStatusMeta } from '../../../constants/offerStatus.js';
import { HANDOVER_STATUS, getHandoverStatusMeta } from '../../../constants/joiningStatus.js';

/**
 * Joining table. Shows one row per joining record with the document,
 * verification, joining and handover progress.
 */
export default function JoiningTable({
  rows,
  loading,
  onView,
  onViewOffer,
  onMarkJoined,
  onOpenHandover,
}) {
  const columns = [
    {
      key: 'candidate',
      header: 'Candidate Name',
      render: (row) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(row.candidate.fullName)}</div>
          <div className="cell-user__text">
            <div className="cell-user__name">{row.candidate.fullName}</div>
            <div className="cell-user__sub">{row.candidate.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'candidateId',
      header: 'Candidate ID',
      render: (row) => <span className="cell-strong">{row.candidate.candidateId}</span>,
    },
    {
      key: 'applicationId',
      header: 'Application ID',
      render: (row) => <span className="cell-strong">{row.application.applicationId}</span>,
    },
    {
      key: 'position',
      header: 'Job Position',
      render: (row) => <div>{row.job?.title || '—'}</div>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => row.offer?.department || row.job?.department || '—',
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      render: (row) => formatDate(row.joining.joiningDate),
    },
    {
      key: 'offerStatus',
      header: 'Offer Status',
      render: (row) => {
        if (!row.offer) return <span className="cell-muted">—</span>;
        const meta = getOfferStatusMeta(row.offer.status);
        return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
      },
    },
    {
      key: 'documentStatus',
      header: 'Document Status',
      render: (row) => (
        <span className="cell-strong">
          {row.documentsVerified}/{row.documentsTotal} verified
        </span>
      ),
    },
    {
      key: 'verification',
      header: 'Verification Status',
      render: (row) => (
        <Badge variant={row.verification === 'all_verified' ? 'green' : row.verification === 'issues' ? 'red' : 'orange'}>
          {row.verification === 'all_verified'
            ? 'All verified'
            : row.verification === 'issues'
              ? 'Resubmission required'
              : 'Verification pending'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Joining Status',
      render: (row) => <CandidateStatusBadge status={row.joining.status} kind="joining" />,
    },
    {
      key: 'handover',
      header: 'Handover Status',
      render: (row) => {
        const meta = getHandoverStatusMeta(row.handoverStatus);
        return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const joined = row.joining.status === 'joined';
        const isImported = row.handoverStatus === HANDOVER_STATUS.IMPORTED;

        return (
          <div className="cell-actions">
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onView(row)}
              aria-label={`View joining details of ${row.candidate.fullName}`}
              title="View joining details"
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onViewOffer(row)}
              aria-label={`View accepted offer of ${row.candidate.fullName}`}
              title="View accepted offer"
            >
              <FileText size={16} />
            </button>
            {!joined && (
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onMarkJoined(row)}
                aria-label={`Mark ${row.candidate.fullName} as joined`}
                title="Mark as joined"
              >
                <UserCheck size={16} />
              </button>
            )}
            {joined && (
              <button
                type="button"
                className={`btn btn--icon ${
                  isImported ? 'btn--ghost' : 'btn--secondary'
                }`}
                onClick={() => onOpenHandover(row)}
                aria-label={`Employee handover for ${row.candidate.fullName}`}
                title={isImported ? 'View import result' : 'Employee handover'}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      keyField="rowKey"
      loading={loading}
      minWidth={1580}
      ariaLabel="Joining and onboarding candidates"
      empty={
        <EmptyState
          icon={UserCheck}
          title="No joining records in this view"
          description="Adjust the filters or open the joining checklist for a candidate that accepted an offer."
        />
      }
    />
  );
}
