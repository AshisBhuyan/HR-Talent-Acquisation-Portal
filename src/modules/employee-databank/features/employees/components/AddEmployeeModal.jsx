import Modal from '../../../../../shared/components/Modal.jsx';
import { useToast } from '../../../../../shared/components/Toast.jsx';
import EmployeeForm from './EmployeeForm.jsx';
import useEmployees from '../hooks/useEmployees.js';

export default function AddEmployeeModal({ open, onClose }) {
  const { createEmployee } = useEmployees();
  const toast = useToast();

  const handleSubmit = async (payload) => {
    const employee = await createEmployee(payload);
    toast.success(`${employee.fullName} was added to the current employee databank.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Employee"
      subtitle="HR manual entry · fields are configurable in employeeSchema.js"
      size="lg"
    >
      <EmployeeForm
        key={open ? 'add-open' : 'add-closed'}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel="Save Employee"
        mode="manual"
      />
    </Modal>
  );
}
