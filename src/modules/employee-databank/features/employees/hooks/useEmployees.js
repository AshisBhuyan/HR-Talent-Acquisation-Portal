import { useDatabank } from '../../../context/DatabankContext.jsx';
import employeeService from '../services/employeeService.js';

export function useEmployees() {
  const { employees, loading, refresh } = useDatabank();

  const createEmployee = async (payload) => {
    const employee = await employeeService.createEmployee(payload);
    await refresh();
    return employee;
  };

  const updateEmployee = async (id, payload) => {
    const employee = await employeeService.updateEmployee(id, payload);
    await refresh();
    return employee;
  };

  const deleteEmployee = async (id) => {
    const employee = await employeeService.deleteEmployee(id);
    await refresh();
    return employee;
  };

  return {
    employees,
    loading,
    refresh,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeById: employeeService.getEmployeeById,
  };
}

export default useEmployees;
