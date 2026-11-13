import { Eye, FileText, Pencil, Send } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import CandidateStatusBadge from '../../../components/CandidateStatusBadge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import { formatDate } from '../../../utils/formatDate.js';
import { formatSalary, getInitials } from '../../../utils/formatCandidateData.js';

/**
 * Offer table with the offer lifecycle actions.
 */
export default function OfferTable({
  rows,
  loading,
  onEdit,
  onPreview,
  onSend,
  onRecordResponse,
}) {
  const columns = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(row.candidate.fullName)}</div>
          <div className="cell-user__text">
            <div className="cell-user__name">{row.candidate.fullName}</div>
            <div className="cell-user__sub">{row.offer.offerId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (row) => (
        <div>
          <div>{row.offer.designation}</div>
          <div className="cell-muted">{row.offer.department}</div>
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Package',
      render: (row) => <span className="cell-strong">{formatSalary(row.offer.salaryPackage)}</span>,
    },
    {
      key: 'joiningDate',
      header: 'Joining date',
      render: (row) => formatDate(row.offer.joiningDate),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => formatDate(row.offer.createdAt),
    },
    {
      key: 'letter',
      header: 'Offer letter',
      render: (row) => (
        <span className="cell-muted">{row.offer.offerLetterName || 'Not generated'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <CandidateStatusBadge status={row.offer.status} kind="offer" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => onPreview(row)}
            aria-label={`Preview offer letter of ${row.candidate.fullName}`}
            title="Preview offer letter"
          >
            <FileText size={16} />
          </button>
          {row.offer.status === 'draft' && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onEdit(row)}
                aria-label={`Edit offer of ${row.candidate.fullName}`}
                title="Edit draft offer"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={() => onSend(row)}
                aria-label={`Send offer to ${row.candidate.fullName}`}
                title="Send offer"
              >
                <Send size={16} />
              </button>
            </>
          )}
          {row.offer.status === 'sent' && (
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={() => onRecordResponse(row)}
              aria-label={`Record the response of ${row.candidate.fullName}`}
              title="Record candidate response"
            >
              <Eye size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      keyField="rowKey"
      loading={loading}
      ariaLabel="Offers"
      empty={
        <EmptyState
          icon={FileText}
          title="No offers in this view"
          description="An offer can be created once the hiring recommendation of a candidate has been approved."
        />
      }
    />
  );
}
