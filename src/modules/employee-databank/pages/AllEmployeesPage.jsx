import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Mail,
  UsersRound,
} from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Badge from '../../../shared/components/Badge.jsx';
import Button from '../../../shared/components/Button.jsx';
import DataTable from '../../../shared/components/DataTable.jsx';
import EmployeeSearch from '../components/EmployeeSearch.jsx';
import EmployeeFilters from '../components/EmployeeFilters.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FormerEmployeeViewModal from '../features/former-employees/components/FormerEmployeeViewModal.jsx';
import { useDatabank } from '../context/DatabankContext.jsx';
import { DEPARTMENTS } from '../constants/employeeStatus.js';
import { formatDate } from '../utils/formatDate.js';
import { getInitials } from '../utils/formatEmployeeData.js';
import { ROUTES } from '../../../app/routeConfig.js';

function toRow(employee, recordType) {
  return recordType === 'current'
    ? {
        ...employee,
        recordType,
        displayId: employee.employeeId,
        displayDepartment: employee.department,
        displayDesignation: employee.designation,
        displayDate: employee.joiningDate,
        dateLabel: 'Joined',
      }
    : {
        ...employee,
        recordType,
        displayId: employee.previousEmployeeId,
        displayDepartment: employee.previousDepartment,
        displayDesignation: employee.previousDesignation,
        displayDate: employee.leavingDate,
        dateLabel: 'Left',
      };
}

export default function AllEmployeesPage() {
  const { employees, formerEmployees, loading } = useDatabank();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [recordType, setRecordType] = useState('');
  const [department, setDepartment] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [viewingFormer, setViewingFormer] = useState(null);

  const rows = useMemo(() => {
    const combined = [
      ...employees.map((employee) => toRow(employee, 'current')),
      ...formerEmployees.map((employee) => toRow(employee, 'former')),
    ];

    return combined.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees, formerEmployees]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesTerm =
        !term ||
        [
          row.fullName,
          row.email,
          row.displayId,
          row.displayDesignation,
          row.displayDepartment,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesType = !recordType || row.recordType === recordType;
      const matchesDepartment = !department || row.displayDepartment === department;

      return matchesTerm && matchesType && matchesDepartment;
    });
  }, [rows, search, recordType, department]);

  const clearFilters = () => {
    setSearch('');
    setRecordType('');
    setDepartment('');
  };

  const handleView = (row) => {
    if (row.recordType === 'current') {
      navigate(ROUTES.employeeProfile(row.id));
      return;
    }
    setViewingFormer(row);
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(row.fullName)}</div>
          <div className="cell-user__text">
            <div className="cell-user__name">{row.fullName}</div>
            <div className="cell-user__sub">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant={row.recordType === 'current' ? 'green' : 'grey'} dot>
          {row.recordType === 'current' ? 'Current' : 'Former'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: 'Employee ID',
      render: (row) => <span className="cell-strong">{row.displayId}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => row.displayDepartment,
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (row) => row.displayDesignation,
    },
    {
      key: 'cv',
      header: 'CV',
      render: (row) => (
        <Badge variant={row.cv ? 'green' : 'grey'}>{row.cv ? 'Attached' : 'Missing'}</Badge>
      ),
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
            onClick={() => handleView(row)}
            aria-label={`View ${row.fullName}`}
            title={row.recordType === 'current' ? 'View profile' : 'View former record'}
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="All Employees"
        subtitle="Every current and former employee record in one combined view. Use the filters to focus on a specific group."
      />

      <div className="page-toolbar">
        <EmployeeSearch
          value={search}
          onChange={setSearch}
          label="Search all employees"
          placeholder="Search all employees by name, email or ID…"
        />
        <EmployeeFilters
          filters={[
            {
              key: 'type',
              label: 'Employee Types',
              placeholder: 'All Employee Types',
              value: recordType,
              onChange: setRecordType,
              options: [
                { value: 'current', label: 'Current Employees' },
                { value: 'former', label: 'Former Employees' },
              ],
            },
            {
              key: 'department',
              label: 'Departments',
              placeholder: 'All Departments',
              value: department,
              onChange: setDepartment,
              options: DEPARTMENTS,
            },
          ]}
          onClear={clearFilters}
        />
        <div className="page-toolbar__spacer" />
        <span className="filters-summary">
          {loading ? 'Loading records…' : `${filtered.length} of ${rows.length} employees shown`}
        </span>
        <div className="view-toggle" role="group" aria-label="Switch employee view">
          <button
            type="button"
            className={`view-toggle__btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            <List size={15} aria-hidden="true" />
            List
          </button>
          <button
            type="button"
            className={`view-toggle__btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            aria-pressed={viewMode === 'cards'}
          >
            <LayoutGrid size={15} aria-hidden="true" />
            Cards
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          ariaLabel="All employee records"
          footer={
            <>
              <span>
                Showing <strong>{filtered.length}</strong> of {rows.length} employee record
                {rows.length === 1 ? '' : 's'}
              </span>
              <span className="cell-muted">Current + former employees</span>
            </>
          }
          empty={
            <EmptyState
              icon={UsersRound}
              title="No employees match this view"
              description="Adjust your search or filters to see current and former employee records."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          {loading && (
            <div className="loading-block">
              <div className="spinner" />
              Loading employee cards…
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="employee-card-grid">
              {filtered.map((row) => (
                <article className="employee-card" key={`${row.recordType}-${row.id}`}>
                  <div className="employee-card__top">
                    <div className="avatar avatar--lg">{getInitials(row.fullName)}</div>
                    <div className="employee-card__identity">
                      <h3 className="employee-card__name">{row.fullName}</h3>
                      <p className="employee-card__role">{row.displayDesignation}</p>
                      <p className="employee-card__dept">{row.displayDepartment}</p>
                    </div>
                    <Badge variant={row.recordType === 'current' ? 'green' : 'grey'} dot>
                      {row.recordType === 'current' ? 'Current' : 'Former'}
                    </Badge>
                  </div>

                  <div className="employee-card__meta">
                    <span className="employee-card__meta-item">
                      <Mail size={14} aria-hidden="true" />
                      {row.email}
                    </span>
                    <span className="employee-card__meta-item">
                      <CalendarDays size={14} aria-hidden="true" />
                      {row.dateLabel} {formatDate(row.displayDate)}
                    </span>
                    <span className="employee-card__meta-item">
                      <FileText size={14} aria-hidden="true" />
                      {row.cv ? 'CV attached' : 'No CV on file'}
                      <Badge variant={row.cv ? 'green' : 'grey'}>
                        {row.cv ? 'Ready' : 'Missing'}
                      </Badge>
                    </span>
                  </div>

                  <div className="employee-card__footer">
                    <span className="cell-muted">{row.displayId}</span>
                    <div className="cell-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon"
                        onClick={() => handleView(row)}
                        aria-label={`View ${row.fullName}`}
                        title={row.recordType === 'current' ? 'View profile' : 'View former record'}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="card">
              <EmptyState
                icon={UsersRound}
                title="No employees match this view"
                description="Adjust your search or filters to see current and former employee records."
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            </div>
          )}
        </>
      )}

      <FormerEmployeeViewModal
        open={Boolean(viewingFormer)}
        employee={viewingFormer}
        onClose={() => setViewingFormer(null)}
      />
    </div>
  );
}
