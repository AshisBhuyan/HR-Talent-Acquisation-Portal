import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronRight, LayoutGrid, List, Mail, Plus, UserPlus, UsersRound } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import EmployeeSearch from '../components/EmployeeSearch.jsx';
import EmployeeFilters from '../components/EmployeeFilters.jsx';
import EmployeeTable from '../components/EmployeeTable.jsx';
import EmployeeCard from '../components/EmployeeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import EditEmployeeModal from '../features/employees/components/EditEmployeeModal.jsx';
import useEmployees from '../features/employees/hooks/useEmployees.js';
import cvService from '../features/cv-management/services/cvService.js';
import { DEPARTMENTS, EMPLOYMENT_TYPES } from '../constants/employeeStatus.js';
import { ROUTES } from '../../../app/routeConfig.js';

export default function CurrentEmployeesPage() {
  const { openAddEmployee, openInvite } = useOutletContext();
  const { employees, loading, deleteEmployee } = useEmployees();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesTerm =
        !term ||
        [employee.fullName, employee.email, employee.employeeId, employee.designation, employee.department]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesDepartment = !department || employee.department === department;
      const matchesType = !employmentType || employee.employmentType === employmentType;

      return matchesTerm && matchesDepartment && matchesType;
    });
  }, [employees, search, department, employmentType]);

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setEmploymentType('');
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteEmployee(deleting.id);
      cvService.removeCV(deleting.cv);
      toast.success(`${deleting.fullName} was removed from the current employee databank.`);
      setDeleting(null);
    } catch (error) {
      toast.error(error.message || 'The employee could not be removed.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Current Employees"
        subtitle="Active employee records stored in the main databank. Open a profile to manage CV documents and employee information."
      />

      <div className="employee-acquisition">
        <div className="employee-acquisition__copy">
          <div className="employee-acquisition__eyebrow">Add employees</div>
          <p>Invite an employee to self-onboard, or create their record manually.</p>
        </div>
        <div className="employee-acquisition__actions">
          <button type="button" className="acquisition-option" onClick={openInvite}>
            <span className="acquisition-option__icon">
              <Mail size={18} aria-hidden="true" />
            </span>
            <span className="acquisition-option__text">
              <span className="acquisition-option__title">Send invitation</span>
              <span className="acquisition-option__desc">Email a secure onboarding link</span>
            </span>
            <ChevronRight className="acquisition-option__chevron" size={16} aria-hidden="true" />
          </button>

          <button type="button" className="acquisition-option" onClick={openAddEmployee}>
            <span className="acquisition-option__icon acquisition-option__icon--secondary">
              <UserPlus size={18} aria-hidden="true" />
            </span>
            <span className="acquisition-option__text">
              <span className="acquisition-option__title">Add employee manually</span>
              <span className="acquisition-option__desc">Enter details and attach a CV</span>
            </span>
            <ChevronRight className="acquisition-option__chevron" size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <EmployeeSearch value={search} onChange={setSearch} label="Search current employees" />
        <EmployeeFilters
          filters={[
            {
              key: 'department',
              label: 'Departments',
              placeholder: 'All Departments',
              value: department,
              onChange: setDepartment,
              options: DEPARTMENTS,
            },
            {
              key: 'employmentType',
              label: 'Employment Types',
              placeholder: 'All Employment Types',
              value: employmentType,
              onChange: setEmploymentType,
              options: EMPLOYMENT_TYPES,
            },
          ]}
          onClear={clearFilters}
        />
        <div className="page-toolbar__spacer" />
        <div className="view-toggle" role="group" aria-label="Switch employee view">
          <button
            type="button"
            className={`view-toggle__btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            <List size={15} aria-hidden="true" />
            Table
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

      <div className="filters-summary">
        {loading ? 'Loading employee records…' : `${filtered.length} of ${employees.length} employees shown`}
      </div>

      {viewMode === 'table' && (
        <EmployeeTable
          employees={filtered}
          loading={loading}
          onView={(employee) => navigate(ROUTES.employeeProfile(employee.id))}
          onEdit={setEditing}
          onDelete={setDeleting}
          emptyAction={
            <Button icon={Plus} size="sm" onClick={openAddEmployee}>
              Add Employee
            </Button>
          }
        />
      )}

      {viewMode === 'cards' && (
        <>
          {loading && (
            <div className="loading-block">
              <div className="spinner" />
              Loading employee cards…
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="employee-card-grid">
              {filtered.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onView={(item) => navigate(ROUTES.employeeProfile(item.id))}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="card">
              <EmptyState
                icon={UsersRound}
                title="No employees match this view"
                description="Adjust your search or filters, or add a new employee to the databank."
                action={
                  <Button icon={Plus} size="sm" onClick={openAddEmployee}>
                    Add Employee
                  </Button>
                }
              />
            </div>
          )}
        </>
      )}

      <EditEmployeeModal
        open={Boolean(editing)}
        employee={editing}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete employee record?"
        message={
          deleting
            ? `${deleting.fullName} (${deleting.employeeId}) will be removed from the current employee databank. This does not create a former employee record.`
            : ''
        }
        confirmLabel="Delete employee"
      />
    </div>
  );
}
