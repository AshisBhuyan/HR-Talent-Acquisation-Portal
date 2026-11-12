import Modal from '../../../../../shared/components/Modal.jsx';
import { useToast } from '../../../../../shared/components/Toast.jsx';
import EmployeeForm from './EmployeeForm.jsx';
import useEmployees from '../hooks/useEmployees.js';

export default function EditEmployeeModal({ open, onClose, employee }) {
  const { updateEmployee } = useEmployees();
  const toast = useToast();

  const handleSubmit = async (payload) => {
    const updated = await updateEmployee(employee.id, payload);
    toast.success(`${updated.fullName}'s employee record was updated.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Employee"
      subtitle={employee ? `${employee.fullName} · ${employee.employeeId}` : ''}
      size="lg"
    >
      {employee && (
        <EmployeeForm
          key={employee.id}
          initialData={employee}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save Changes"
          mode="manual"
        />
      )}
    </Modal>
  );
}
