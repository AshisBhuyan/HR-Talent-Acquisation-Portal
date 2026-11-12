import {
  createServiceError,
  delay,
  isDuplicateEmail,
  makeId,
  mutateDatabase,
  nextEmployeeCode,
  readDatabase,
} from '../../../services/mockBackend.js';

function normalizeEmployeeInput(payload = {}) {
  return {
    employeeId: payload.employeeId?.trim() || '',
    fullName: payload.fullName?.trim() || '',
    email: payload.email?.trim() || '',
    contactNumber: payload.contactNumber?.trim() || '',
    profilePhoto: payload.profilePhoto || '',
    department: payload.department || '',
    designation: payload.designation?.trim() || '',
    joiningDate: payload.joiningDate || '',
    employmentType: payload.employmentType || '',
    reportingManager: payload.reportingManager?.trim() || '',
    education: {
      qualification: payload.education?.qualification?.trim() || '',
      institution: payload.education?.institution?.trim() || '',
      specialization: payload.education?.specialization?.trim() || '',
      passingYear: payload.education?.passingYear?.trim() || '',
    },
    experience: {
      previousCompany: payload.experience?.previousCompany?.trim() || '',
      previousDesignation: payload.experience?.previousDesignation?.trim() || '',
      totalExperience: payload.experience?.totalExperience?.trim() || '',
      jobResponsibilities: payload.experience?.jobResponsibilities?.trim() || '',
    },
    cv: payload.cv || null,
  };
}

function ensureUniqueEmployee(database, payload, excludeId = null) {
  if (isDuplicateEmail(database, payload.email, excludeId)) {
    throw createServiceError('This email address already belongs to an employee record.', {
      email: 'This email address is already in use.',
    });
  }

  if (payload.employeeId) {
    const duplicateCode = database.employees.find(
      (employee) =>
        employee.id !== excludeId &&
        String(employee.employeeId || '').toLowerCase() === payload.employeeId.toLowerCase()
    );
    if (duplicateCode) {
      throw createServiceError('This employee ID is already in use.', {
        employeeId: 'This employee ID is already in use.',
      });
    }
  }
}

export const employeeService = {
  async getEmployees() {
    await delay(220);
    const database = readDatabase();
    return database.employees
      .filter((employee) => employee.status === 'current')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getEmployeeById(id) {
    await delay(180);
    const database = readDatabase();
    return database.employees.find((employee) => employee.id === id) || null;
  },

  async createEmployee(payload) {
    await delay(420);
    return mutateDatabase((database) => {
      const normalized = normalizeEmployeeInput(payload);
      ensureUniqueEmployee(database, normalized);

      const now = new Date().toISOString();
      const employee = {
        ...normalized,
        id: makeId('emp'),
        employeeId: normalized.employeeId || nextEmployeeCode(database),
        status: 'current',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      };

      database.employees.unshift(employee);
      return employee;
    });
  },

  async updateEmployee(id, payload) {
    await delay(380);
    return mutateDatabase((database) => {
      const index = database.employees.findIndex((employee) => employee.id === id);
      if (index === -1) {
        throw createServiceError('Employee record could not be found.');
      }

      const normalized = normalizeEmployeeInput(payload);
      ensureUniqueEmployee(database, normalized, id);

      const updated = {
        ...database.employees[index],
        ...normalized,
        employeeId: normalized.employeeId || database.employees[index].employeeId,
        updatedAt: new Date().toISOString(),
      };

      database.employees[index] = updated;
      return updated;
    });
  },

  async deleteEmployee(id) {
    await delay(300);
    return mutateDatabase((database) => {
      const index = database.employees.findIndex((employee) => employee.id === id);
      if (index === -1) {
        throw createServiceError('Employee record could not be found.');
      }
      const [removed] = database.employees.splice(index, 1);
      return removed;
    });
  },
};

export default employeeService;
