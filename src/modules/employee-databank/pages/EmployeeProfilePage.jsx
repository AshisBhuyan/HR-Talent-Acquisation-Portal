import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Mail,
  Pencil,
  Phone,
  Trash2,
  UserX,
} from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import EmployeeStatusBadge from '../components/EmployeeStatusBadge.jsx';
import EmployeeDetails from '../features/employees/components/EmployeeDetails.jsx';
import EditEmployeeModal from '../features/employees/components/EditEmployeeModal.jsx';
import CVFileInfo from '../features/cv-management/components/CVFileInfo.jsx';
import CVReplace from '../features/cv-management/components/CVReplace.jsx';
import cvService from '../features/cv-management/services/cvService.js';
import useEmployees from '../features/employees/hooks/useEmployees.js';
import { useToast } from '../../../shared/components/Toast.jsx';
import { ROUTES } from '../../../app/routeConfig.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';
import { getInitials } from '../utils/formatEmployeeData.js';
import '../styles/employeeProfile.css';

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const { employees, loading, updateEmployee, deleteEmployee } = useEmployees();
  const navigate = useNavigate();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);

  const employee = employees.find((item) => item.id === employeeId);

  if (loading && !employee) {
    return (
      <div className="loading-block">
        <div className="spinner" />
        Loading employee profile…
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page">
        <Link className="back-link" to={ROUTES.CURRENT}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Current Employees
        </Link>
        <div className="card">
          <EmptyState
            icon={UserX}
            title="Employee profile not found"
            description="This record may have been removed or the link is no longer valid."
            action={
              <Link className="btn btn--primary" to={ROUTES.CURRENT}>
                Return to Current Employees
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const handleCvReplace = async (file) => {
    setCvBusy(true);
    try {
      const cv = await cvService.replaceCV(employee.cv, file);
      await updateEmployee(employee.id, { ...employee, cv });
      toast.success('Employee CV was replaced. The new document is available for preview.');
    } catch (error) {
      toast.error(error.errors?.[0] || error.message || 'The CV could not be replaced.');
    } finally {
      setCvBusy(false);
    }
  };

  const handleCvRemove = async () => {
    setCvBusy(true);
    try {
      cvService.removeCV(employee.cv);
      await updateEmployee(employee.id, { ...employee, cv: null });
    } catch (error) {
      toast.error(error.message || 'The CV could not be removed.');
    } finally {
      setCvBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEmployee(employee.id);
      cvService.removeCV(employee.cv);
      toast.success(`${employee.fullName} was removed from the current employee databank.`);
      setDeleteOpen(false);
      navigate(ROUTES.CURRENT);
    } catch (error) {
      toast.error(error.message || 'The employee could not be removed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <Link className="back-link" to={ROUTES.CURRENT}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Current Employees
      </Link>

      <PageHeader
        eyebrow={`Employee ID · ${employee.employeeId}`}
        title={employee.fullName}
        subtitle={`${employee.designation} · ${employee.department}`}
        actions={
          <>
            <Button variant="outline" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit Employee
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </>
        }
      />

      <div className="profile-hero card">
        <div className="profile-hero__avatar avatar avatar--lg">
          {employee.profilePhoto ? (
            <img src={employee.profilePhoto} alt="" />
          ) : (
            getInitials(employee.fullName)
          )}
        </div>
        <div className="profile-hero__identity">
          <div className="profile-hero__name-row">
            <h2 className="profile-hero__name">{employee.fullName}</h2>
            <EmployeeStatusBadge status={employee.status} />
          </div>
          <p className="profile-hero__role">
            {employee.designation} · {employee.department}
          </p>
          <div className="profile-hero__contacts">
            <span>
              <Mail size={14} aria-hidden="true" />
              {employee.email}
            </span>
            <span>
              <Phone size={14} aria-hidden="true" />
              {employee.contactNumber}
            </span>
            <span>
              <FileText size={14} aria-hidden="true" />
              {employee.cv ? 'CV available' : 'No CV on file'}
            </span>
          </div>
        </div>
        <div className="profile-hero__meta">
          <div>
            <span className="detail-item__label">Employment Type</span>
            <strong>{employee.employmentType || '—'}</strong>
          </div>
          <div>
            <span className="detail-item__label">Source</span>
            <strong>{employee.source === 'self-service' ? 'Self-service' : 'HR manual'}</strong>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        <div className="card profile-layout__main">
          <div className="card__header">
            <div>
              <h3 className="card__title">Employee Information</h3>
              <p className="card__subtitle">
                Basic, professional, education and experience details.
              </p>
            </div>
          </div>
          <div className="card__body">
            <EmployeeDetails employee={employee} />
          </div>
        </div>

        <aside className="profile-layout__side">
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="card__title">CV Documents</h3>
                <p className="card__subtitle">Reusable CV management</p>
              </div>
            </div>
            <div className="card__body">
              {employee.cv ? (
                <CVFileInfo
                  cv={employee.cv}
                  onReplace={handleCvReplace}
                  onRemove={handleCvRemove}
                  uploading={cvBusy}
                  disabled={cvBusy}
                />
              ) : (
                <div className="cv-missing">
                  <div className="empty-state__icon">
                    <FileText size={22} aria-hidden="true" />
                  </div>
                  <p className="empty-state__title">No CV on file</p>
                  <p className="empty-state__text">
                    Upload a PDF or Word document to complete this employee record.
                  </p>
                  <CVReplace onReplace={handleCvReplace} uploading={cvBusy} label="Upload CV" />
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="card__title">Record Metadata</h3>
                <p className="card__subtitle">Audit information from the mock service</p>
              </div>
            </div>
            <div className="card__body">
              <div className="profile-meta-list">
                <div>
                  <span className="detail-item__label">Created</span>
                  <span>{formatDateTime(employee.createdAt)}</span>
                </div>
                <div>
                  <span className="detail-item__label">Last Updated</span>
                  <span>{formatDateTime(employee.updatedAt)}</span>
                </div>
                <div>
                  <span className="detail-item__label">Joining Date</span>
                  <span>{formatDate(employee.joiningDate)}</span>
                </div>
                <div>
                  <span className="detail-item__label">Reporting Manager</span>
                  <span>{employee.reportingManager || '—'}</span>
                </div>
              </div>
              <div className="notice notice--neutral" style={{ marginTop: '1rem' }}>
                <span className="notice__icon">
                  <AlertCircle size={17} aria-hidden="true" />
                </span>
                <div className="notice__body">
                  Mock frontend storage only. Production CV access must be protected by backend
                  authorization.
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <EditEmployeeModal
        open={editOpen}
        employee={employee}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete employee record?"
        message={`${employee.fullName} (${employee.employeeId}) will be removed from the current employee databank. This action does not automatically create a former employee record.`}
        confirmLabel="Delete employee"
      />
    </div>
  );
}
