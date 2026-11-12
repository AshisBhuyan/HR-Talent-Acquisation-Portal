import { BriefcaseBusiness, Pencil, UserMinus } from 'lucide-react';
import Modal from '../../../../../shared/components/Modal.jsx';
import Button from '../../../../../shared/components/Button.jsx';
import Badge from '../../../../../shared/components/Badge.jsx';
import EmploymentHistory from './EmploymentHistory.jsx';
import CVFileInfo from '../../cv-management/components/CVFileInfo.jsx';
import { formatDate } from '../../../utils/formatDate.js';
import { getInitials } from '../../../utils/formatEmployeeData.js';

export default function FormerEmployeeViewModal({ open, employee, onClose, onEdit }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Former Employee Record"
      subtitle={employee ? `${employee.fullName} · ${employee.previousEmployeeId}` : ''}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button icon={Pencil} onClick={() => onEdit(employee)}>
              Edit Record
            </Button>
          )}
        </>
      }
    >
      {employee && (
        <div className="former-view">
          <div className="former-view__hero">
            <div className="avatar avatar--lg">{getInitials(employee.fullName)}</div>
            <div>
              <h3 className="former-view__name">{employee.fullName}</h3>
              <p className="former-view__role">
                {employee.previousDesignation} · {employee.previousDepartment}
              </p>
              <div className="former-view__badges">
                <Badge variant="grey" dot>
                  Former Employee
                </Badge>
                <Badge variant={employee.cv ? 'green' : 'grey'}>
                  {employee.cv ? 'CV attached' : 'No CV'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="detail-grid detail-grid--3">
            <div className="detail-item">
              <div className="detail-item__label">Previous Employee ID</div>
              <div className="detail-item__value">{employee.previousEmployeeId}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Email Address</div>
              <div className="detail-item__value">{employee.email}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Contact Number</div>
              <div className="detail-item__value">{employee.contactNumber}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Joining Date</div>
              <div className="detail-item__value">{formatDate(employee.joiningDate)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Leaving Date</div>
              <div className="detail-item__value">{formatDate(employee.leavingDate)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Last Designation</div>
              <div className="detail-item__value">{employee.previousDesignation}</div>
            </div>
            {employee.notes && (
              <div className="detail-item detail-item--full">
                <div className="detail-item__label">Internal Notes</div>
                <div className="detail-item__value">{employee.notes}</div>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h4 className="detail-section__title">
              <BriefcaseBusiness size={16} aria-hidden="true" />
              Employment History
            </h4>
            <EmploymentHistory entries={employee.employmentHistory || []} readOnly />
          </div>

          <div className="detail-section">
            <h4 className="detail-section__title">Previous CV</h4>
            {employee.cv ? (
              <CVFileInfo cv={employee.cv} showReplace={false} showRemove={false} />
            ) : (
              <div className="notice notice--neutral">
                <span className="notice__icon">
                  <UserMinus size={17} aria-hidden="true" />
                </span>
                <div className="notice__body">No previous CV is stored for this record.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
