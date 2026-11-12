import { Eye, Pencil, Trash2, UsersRound } from 'lucide-react';
import DataTable from '../../../shared/components/DataTable.jsx';
import Badge from '../../../shared/components/Badge.jsx';
import EmployeeStatusBadge from './EmployeeStatusBadge.jsx';
import EmptyState from './EmptyState.jsx';
import { CV_STATUS_META } from '../constants/employeeStatus.js';
import { formatDate } from '../utils/formatDate.js';
import { getInitials } from '../utils/formatEmployeeData.js';

function EmployeeCell({ employee }) {
  return (
    <div className="cell-user">
      <div className="avatar">
        {employee.profilePhoto ? (
          <img src={employee.profilePhoto} alt="" />
        ) : (
          getInitials(employee.fullName)
        )}
      </div>
      <div className="cell-user__text">
        <div className="cell-user__name">{employee.fullName}</div>
        <div className="cell-user__sub">{employee.email}</div>
      </div>
    </div>
  );
}

export default function EmployeeTable({
  employees,
  loading,
  onView,
  onEdit,
  onDelete,
  emptyAction,
}) {
  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (employee) => <EmployeeCell employee={employee} />,
    },
    {
      key: 'employeeId',
      header: 'Employee ID',
      render: (employee) => <span className="cell-strong">{employee.employeeId}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (employee) => employee.department,
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (employee) => employee.designation,
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      render: (employee) => formatDate(employee.joiningDate),
    },
    {
      key: 'cv',
      header: 'CV',
      render: (employee) => {
        const meta = employee.cv ? CV_STATUS_META.provided : CV_STATUS_META.missing;
        return <Badge variant={meta.variant}>{employee.cv ? 'Attached' : 'Missing'}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee) => <EmployeeStatusBadge status={employee.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (employee) => (
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
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={employees}
      loading={loading}
      ariaLabel="Current employees"
      footer={
        <>
          <span>
            Showing <strong>{employees.length}</strong> current employee
            {employees.length === 1 ? '' : 's'}
          </span>
          <span className="cell-muted">Mock databank · local browser storage</span>
        </>
      }
      empty={
        <EmptyState
          icon={UsersRound}
          title="No current employees found"
          description="Try adjusting your search or filters, or add a new employee to the databank."
          action={emptyAction}
        />
      }
    />
  );
}
