import { useDatabank } from '../../../context/DatabankContext.jsx';
import formerEmployeeService from '../services/formerEmployeeService.js';

export function useFormerEmployees() {
  const { formerEmployees, loading, refresh } = useDatabank();

  const createFormerEmployee = async (payload) => {
    const record = await formerEmployeeService.createFormerEmployee(payload);
    await refresh();
    return record;
  };

  const updateFormerEmployee = async (id, payload) => {
    const record = await formerEmployeeService.updateFormerEmployee(id, payload);
    await refresh();
    return record;
  };

  const deleteFormerEmployee = async (id) => {
    const record = await formerEmployeeService.deleteFormerEmployee(id);
    await refresh();
    return record;
  };

  return {
    formerEmployees,
    loading,
    refresh,
    createFormerEmployee,
    updateFormerEmployee,
    deleteFormerEmployee,
    getFormerEmployeeById: formerEmployeeService.getFormerEmployeeById,
  };
}

export default useFormerEmployees;
