import { Briefcase } from 'lucide-react';
import DataTable from '../../../../../shared/components/DataTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';

/**
 * Applications by position with the shortlist and selection counts.
 */
export default function PositionTable({ positions = [], loading }) {
  const columns = [
    {
      key: 'title',
      header: 'Position',
      render: (row) => (
        <div>
          <div>{row.title}</div>
          <div className="cell-muted">{row.department}</div>
        </div>
      ),
    },
    {
      key: 'openings',
      header: 'Openings',
      align: 'right',
      render: (row) => row.openings,
    },
    {
      key: 'applications',
      header: 'Applications',
      align: 'right',
      render: (row) => <span className="cell-strong">{row.applications}</span>,
    },
    {
      key: 'shortlisted',
      header: 'Shortlisted',
      align: 'right',
      render: (row) => row.shortlisted,
    },
    {
      key: 'selected',
      header: 'Selected',
      align: 'right',
      render: (row) => row.selected,
    },
    {
      key: 'conversion',
      header: 'Selection rate',
      align: 'right',
      render: (row) =>
        row.applications
          ? `${Math.round((row.selected / row.applications) * 100)}%`
          : '—',
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={positions}
      keyField="jobId"
      loading={loading}
      ariaLabel="Applications by position"
      empty={
        <EmptyState
          icon={Briefcase}
          title="No position data in this scope"
          description="Adjust the report filters to include more applications."
        />
      }
    />
  );
}
