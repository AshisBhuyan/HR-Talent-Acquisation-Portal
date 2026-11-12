import {
  createServiceError,
  delay,
  isDuplicateEmail,
  makeId,
  mutateDatabase,
  readDatabase,
} from '../../../services/mockBackend.js';

function normalizeFormerEmployeeInput(payload = {}) {
  return {
    previousEmployeeId: payload.previousEmployeeId?.trim() || '',
    fullName: payload.fullName?.trim() || '',
    email: payload.email?.trim() || '',
    contactNumber: payload.contactNumber?.trim() || '',
    previousDepartment: payload.previousDepartment || '',
    previousDesignation: payload.previousDesignation?.trim() || '',
    joiningDate: payload.joiningDate || '',
    leavingDate: payload.leavingDate || '',
    employmentHistory: Array.isArray(payload.employmentHistory)
      ? payload.employmentHistory
          .filter((entry) => entry && (entry.company || entry.designation))
          .map((entry) => ({
            company: entry.company?.trim() || '',
            designation: entry.designation?.trim() || '',
            from: entry.from || '',
            to: entry.to || '',
          }))
      : [],
    notes: payload.notes?.trim() || '',
    cv: payload.cv || null,
  };
}

function ensureUniqueFormerEmployee(database, payload, excludeId = null) {
  if (isDuplicateEmail(database, payload.email, excludeId)) {
    throw createServiceError('This email address already belongs to an employee record.', {
      email: 'This email address is already in use.',
    });
  }

  if (payload.previousEmployeeId) {
    const duplicate = database.formerEmployees.find(
      (person) =>
        person.id !== excludeId &&
        String(person.previousEmployeeId || '').toLowerCase() ===
          payload.previousEmployeeId.toLowerCase()
    );
    if (duplicate) {
      throw createServiceError('This previous employee ID is already in use.', {
        previousEmployeeId: 'This previous employee ID is already in use.',
      });
    }
  }
}

export const formerEmployeeService = {
  async getFormerEmployees() {
    await delay(220);
    const database = readDatabase();
    return database.formerEmployees
      .filter((person) => person.status === 'former')
      .sort((a, b) => new Date(b.leavingDate || b.createdAt) - new Date(a.leavingDate || a.createdAt));
  },

  async getFormerEmployeeById(id) {
    await delay(160);
    const database = readDatabase();
    return database.formerEmployees.find((person) => person.id === id) || null;
  },

  async createFormerEmployee(payload) {
    await delay(400);
    return mutateDatabase((database) => {
      const normalized = normalizeFormerEmployeeInput(payload);
      ensureUniqueFormerEmployee(database, normalized);

      const now = new Date().toISOString();
      const formerEmployee = {
        ...normalized,
        id: makeId('frm'),
        status: 'former',
        createdAt: now,
        updatedAt: now,
      };

      database.formerEmployees.unshift(formerEmployee);
      return formerEmployee;
    });
  },

  async updateFormerEmployee(id, payload) {
    await delay(360);
    return mutateDatabase((database) => {
      const index = database.formerEmployees.findIndex((person) => person.id === id);
      if (index === -1) {
        throw createServiceError('Former employee record could not be found.');
      }

      const normalized = normalizeFormerEmployeeInput(payload);
      ensureUniqueFormerEmployee(database, normalized, id);

      const updated = {
        ...database.formerEmployees[index],
        ...normalized,
        updatedAt: new Date().toISOString(),
      };

      database.formerEmployees[index] = updated;
      return updated;
    });
  },

  async deleteFormerEmployee(id) {
    await delay(300);
    return mutateDatabase((database) => {
      const index = database.formerEmployees.findIndex((person) => person.id === id);
      if (index === -1) {
        throw createServiceError('Former employee record could not be found.');
      }
      const [removed] = database.formerEmployees.splice(index, 1);
      return removed;
    });
  },
};

export default formerEmployeeService;
