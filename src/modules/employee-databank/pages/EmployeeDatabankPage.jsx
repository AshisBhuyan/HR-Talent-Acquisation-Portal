import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertCircle, Plus, Send } from 'lucide-react';
import PageHeader from '../../../shared/components/PageHeader.jsx';
import Button from '../../../shared/components/Button.jsx';
import Modal from '../../../shared/components/Modal.jsx';
import EmployeeStats from '../components/EmployeeStats.jsx';
import EmployeeDatabankTabs from '../components/EmployeeDatabankTabs.jsx';
import AddEmployeeModal from '../features/employees/components/AddEmployeeModal.jsx';
import InvitationForm from '../features/invitations/components/InvitationForm.jsx';
import { useDatabank } from '../context/DatabankContext.jsx';
import '../styles/employeeDatabank.css';

export default function EmployeeDatabankPage() {
  const { stats, error } = useDatabank();
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Ecometrix · Employee CV Management"
        title="Employee Databank"
        subtitle="Manage current and former employee records, self-service invitations and submitted profiles. CV documents are held in one reusable, configurable service."
        actions={
          <>
            <Button variant="outline" icon={Send} onClick={() => setInviteOpen(true)}>
              Send Invitation
            </Button>
            <Button icon={Plus} onClick={() => setAddOpen(true)}>
              Add Employee
            </Button>
          </>
        }
      />

      {error && (
        <div className="notice notice--error" role="alert">
          <span className="notice__icon">
            <AlertCircle size={18} aria-hidden="true" />
          </span>
          <div className="notice__body">
            <div className="notice__title">Databank data could not be loaded</div>
            {error}
          </div>
        </div>
      )}

      <EmployeeStats stats={stats} />

      <div className="databank-panel">
        <EmployeeDatabankTabs
          counts={{
            all: stats.totalEmployees,
            current: stats.currentEmployees,
            former: stats.formerEmployees,
            invitations: stats.pendingInvitations,
            submissions: stats.pendingSubmissions,
          }}
        />
        <div className="databank-panel__body">
          <Outlet
            context={{
              openAddEmployee: () => setAddOpen(true),
              openInvite: () => setInviteOpen(true),
            }}
          />
        </div>
      </div>

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} />

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Send Employee Invitation"
        subtitle="Create a self-service onboarding invitation"
        size="md"
      >
        <InvitationForm onDone={() => setInviteOpen(false)} />
      </Modal>
    </div>
  );
}
