import { useMemo, useState } from 'react';
import { Eye, LayoutGrid, List, Pencil, Plus, Trash2, UserMinus } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import Modal from '../../../shared/components/Modal.jsx';
import DataTable from '../../../shared/components/DataTable.jsx';
import Badge from '../../../shared/components/Badge.jsx';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx';
import { useToast } from '../../../shared/components/Toast.jsx';
import EmployeeSearch from '../components/EmployeeSearch.jsx';
import EmployeeFilters from '../components/EmployeeFilters.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FormerEmployeeForm from '../features/former-employees/components/FormerEmployeeForm.jsx';
import FormerEmployeeCard from '../features/former-employees/components/FormerEmployeeCard.jsx';
import FormerEmployeeViewModal from '../features/former-employees/components/FormerEmployeeViewModal.jsx';
import cvService from '../features/cv-management/services/cvService.js';
import useFormerEmployees from '../features/former-employees/hooks/useFormerEmployees.js';
import { DEPARTMENTS } from '../constants/employeeStatus.js';
import { formatDate } from '../utils/formatDate.js';
import { getInitials } from '../utils/formatEmployeeData.js';

export default function FormerEmployeesPage() {
  const {
    formerEmployees,
    loading,
    createFormerEmployee,
    updateFormerEmployee,
    deleteFormerEmployee,
  } = useFormerEmployees();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return formerEmployees.filter((person) => {
      const matchesTerm =
        !term ||
        [
          person.fullName,
          person.email,
          person.previousEmployeeId,
          person.previousDesignation,
          person.previousDepartment,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesDepartment = !department || person.previousDepartment === department;
      return matchesTerm && matchesDepartment;
    });
  }, [formerEmployees, search, department]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      const record = await createFormerEmployee(payload);
      toast.success(`${record.fullName} was added to former employee records.`);
      setAddOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (payload) => {
    if (!editing) return;
    setSaving(true);
    try {
      const record = await updateFormerEmployee(editing.id, payload);
      toast.success(`${record.fullName}'s former employee record was updated.`);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteFormerEmployee(deleting.id);
      cvService.removeCV(deleting.cv);
      toast.success(`${deleting.fullName} was removed from former employee records.`);
      if (viewing?.id === deleting.id) setViewing(null);
      setDeleting(null);
    } catch (error) {
      toast.error(error.message || 'The former employee record could not be removed.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Former Employee',
      render: (person) => (
        <div className="cell-user">
          <div className="avatar">{getInitials(person.fullName)}</div>
          <div className="cell-user__text">
            <div className="cell-user__name">{person.fullName}</div>
            <div className="cell-user__sub">{person.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'previousEmployeeId',
      header: 'Prev. Employee ID',
      render: (person) => <span className="cell-strong">{person.previousEmployeeId}</span>,
    },
    {
      key: 'previousDepartment',
      header: 'Prev. Department',
      render: (person) => person.previousDepartment,
    },
    {
      key: 'previousDesignation',
      header: 'Prev. Designation',
      render: (person) => person.previousDesignation,
    },
    {
      key: 'dates',
      header: 'Employment Period',
      render: (person) => (
        <span className="cell-muted">
          {formatDate(person.joiningDate)} → {formatDate(person.leavingDate)}
        </span>
      ),
    },
    {
      key: 'cv',
      header: 'CV',
      render: (person) => (
        <Badge variant={person.cv ? 'green' : 'grey'}>
          {person.cv ? 'Attached' : 'Missing'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (person) => (
        <div className="cell-actions">
          <Button
            variant="ghost"
            size="sm"
            className="btn--icon"
            icon={Eye}
            onClick={() => setViewing(person)}
            aria-label={`View ${person.fullName}`}
            title="View record"
            type="button"
          />
          <Button
            variant="outline"
            size="sm"
            className="btn--icon"
            icon={Pencil}
            onClick={() => setEditing(person)}
            aria-label={`Edit ${person.fullName}`}
            title="Edit record"
            type="button"
          />
          <Button
            variant="danger-ghost"
            size="sm"
            className="btn--icon"
            icon={Trash2}
            onClick={() => setDeleting(person)}
            aria-label={`Delete ${person.fullName}`}
            title="Delete record"
            type="button"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Former Employees"
        subtitle="Historical employee records are stored separately from current employees. Previous CVs remain available for reference."
        actions={
          <Button icon={Plus} onClick={() => setAddOpen(true)}>
            Add Former Employee
          </Button>
        }
      />

      <div className="page-toolbar">
        <EmployeeSearch
          value={search}
          onChange={setSearch}
          label="Search former employees"
          placeholder="Search former employees by name, email or previous ID…"
        />
        <EmployeeFilters
          filters={[
            {
              key: 'department',
              label: 'Previous Departments',
              placeholder: 'All Departments',
              value: department,
              onChange: setDepartment,
              options: DEPARTMENTS,
            },
          ]}
          onClear={() => {
            setSearch('');
            setDepartment('');
          }}
        />
        <div className="page-toolbar__spacer" />
        <span className="filters-summary">
          {loading ? 'Loading records…' : `${filtered.length} former employee records`}
        </span>
        <div className="view-toggle" role="group" aria-label="Switch former employee view">
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

      {viewMode === 'table' && (
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          ariaLabel="Former employee records"
          footer={
            <>
              <span>
                Showing <strong>{filtered.length}</strong> former employee record
                {filtered.length === 1 ? '' : 's'}
              </span>
              <span className="cell-muted">Separate from current employees</span>
            </>
          }
          empty={
            <EmptyState
              icon={UserMinus}
              title="No former employees found"
              description="Add a former employee manually or adjust the current search and filter."
              action={
                <Button icon={Plus} size="sm" onClick={() => setAddOpen(true)}>
                  Add Former Employee
                </Button>
              }
            />
          }
        />
      )}

      {viewMode === 'cards' && (
        <>
          {loading && (
            <div className="loading-block">
              <div className="spinner" />
              Loading former employee cards…
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="employee-card-grid">
              {filtered.map((person) => (
                <FormerEmployeeCard
                  key={person.id}
                  employee={person}
                  onView={setViewing}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="card">
              <EmptyState
                icon={UserMinus}
                title="No former employees found"
                description="Add a former employee manually or adjust the current search and filter."
                action={
                  <Button icon={Plus} size="sm" onClick={() => setAddOpen(true)}>
                    Add Former Employee
                  </Button>
                }
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Former Employee"
        subtitle="Manual historical record entry"
        size="lg"
      >
        <FormerEmployeeForm
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
          submitLabel="Save Former Employee"
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Former Employee"
        subtitle={editing ? `${editing.fullName} · ${editing.previousEmployeeId}` : ''}
        size="lg"
      >
        {editing && (
          <FormerEmployeeForm
            key={editing.id}
            initialData={editing}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      <FormerEmployeeViewModal
        open={Boolean(viewing)}
        employee={viewing}
        onClose={() => setViewing(null)}
        onEdit={(person) => {
          setEditing(person);
          setViewing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete former employee record?"
        message={
          deleting
            ? `${deleting.fullName} (${deleting.previousEmployeeId}) will be permanently removed from former employee records.`
            : ''
        }
        confirmLabel="Delete record"
      />
    </div>
  );
}
