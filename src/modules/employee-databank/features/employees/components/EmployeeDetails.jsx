import { BriefcaseBusiness, GraduationCap, History, UserRound } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate.js';

function DetailItem({ label, value, full = false }) {
  return (
    <div className={`detail-item ${full ? 'detail-item--full' : ''}`}>
      <div className="detail-item__label">{label}</div>
      <div className={`detail-item__value ${value ? '' : 'detail-item__value--muted'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

export default function EmployeeDetails({ employee }) {
  if (!employee) return null;

  const education = employee.education || {};
  const experience = employee.experience || {};

  return (
    <div className="employee-details">
      <section className="detail-section">
        <h3 className="detail-section__title">
          <UserRound size={16} aria-hidden="true" />
          Basic Information
        </h3>
        <div className="detail-grid">
          <DetailItem label="Employee ID" value={employee.employeeId} />
          <DetailItem label="Full Name" value={employee.fullName} />
          <DetailItem label="Email Address" value={employee.email} />
          <DetailItem label="Contact Number" value={employee.contactNumber} />
        </div>
      </section>

      <section className="detail-section">
        <h3 className="detail-section__title">
          <BriefcaseBusiness size={16} aria-hidden="true" />
          Professional Information
        </h3>
        <div className="detail-grid">
          <DetailItem label="Department" value={employee.department} />
          <DetailItem label="Designation" value={employee.designation} />
          <DetailItem label="Joining Date" value={formatDate(employee.joiningDate)} />
          <DetailItem label="Employment Type" value={employee.employmentType} />
          <DetailItem label="Reporting Manager" value={employee.reportingManager} />
        </div>
      </section>

      <section className="detail-section">
        <h3 className="detail-section__title">
          <GraduationCap size={16} aria-hidden="true" />
          Education Details
        </h3>
        <div className="detail-grid">
          <DetailItem label="Qualification" value={education.qualification} />
          <DetailItem label="Institution" value={education.institution} />
          <DetailItem label="Specialization" value={education.specialization} />
          <DetailItem label="Passing Year" value={education.passingYear} />
        </div>
      </section>

      <section className="detail-section">
        <h3 className="detail-section__title">
          <History size={16} aria-hidden="true" />
          Professional Experience
        </h3>
        <div className="detail-grid">
          <DetailItem label="Previous Company" value={experience.previousCompany} />
          <DetailItem label="Previous Designation" value={experience.previousDesignation} />
          <DetailItem label="Total Experience" value={experience.totalExperience} />
          <DetailItem
            label="Job Responsibilities"
            value={experience.jobResponsibilities}
            full
          />
        </div>
      </section>
    </div>
  );
}
