/**
 * End-to-end workflow and seed-consistency check for the Talent Acquisition
 * module. Run with: node scripts/ta-workflow-check.mjs
 */
const store = new Map();

global.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
  setTimeout: (fn, ms) => setTimeout(fn, ms),
};

const base = '../src/modules/talent-acquisition/';

const mockBackend = await import(base + 'services/mockBackend.js');
const applications = (await import(base + 'features/candidate-applications/services/candidateApplicationService.js')).default;
const screening = (await import(base + 'features/cv-screening/services/screeningService.js')).default;
const shortlisting = (await import(base + 'features/shortlisting/services/shortlistingService.js')).default;
const interviews = (await import(base + 'features/interviews/services/interviewService.js')).default;
const finalSelection = (await import(base + 'features/final-selection/services/finalSelectionService.js')).default;
const approvals = (await import(base + 'features/approvals/services/approvalService.js')).default;
const offers = (await import(base + 'features/offers/services/offerService.js')).default;
const joining = (await import(base + 'features/joining-onboarding/services/joiningService.js')).default;
const employeeService = (await import(
  '../src/modules/employee-databank/features/employees/services/employeeService.js'
)).default;

const results = [];
function pass(name) {
  results.push(['PASS', name]);
}
function fail(name, error) {
  results.push(['FAIL', `${name} â†’ ${error.message}`]);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const freshDb = () => mockBackend.readDatabase();
const app = (id) => freshDb().applications.find((item) => item.applicationId === id);

/* ------------------------------------------------------------------
   1. Seed consistency
------------------------------------------------------------------ */
const STAGE_ORDER = [
  'applied',
  'under_screening',
  'shortlisted',
  'interview',
  'final_selection',
  'approval',
  'offer',
  'joining',
  'selected',
];
const stageIndex = (status) => STAGE_ORDER.indexOf(status);

for (const approval of freshDb().approvals) {
  const application = app(approval.applicationId);
  assert(application, `approval ${approval.approvalId} has no application`);
  assert(
    stageIndex(application.status) >= stageIndex('approval'),
    `approval ${approval.approvalId} belongs to an application at "${application.status}"`
  );
}
pass('every approval belongs to an application at the approval stage or later');

for (const offer of freshDb().offers) {
  const application = app(offer.applicationId);
  assert(
    stageIndex(application.status) >= stageIndex('offer'),
    `offer ${offer.offerId} belongs to an application at "${application.status}"`
  );
}
pass('every offer belongs to an application at the offer stage or later');

for (const record of freshDb().joinings) {
  const application = app(record.applicationId);
  assert(
    stageIndex(application.status) >= stageIndex('joining'),
    `joining ${record.joiningId} belongs to an application at "${application.status}"`
  );
}
pass('every joining belongs to an application at the joining stage or later');

for (const selection of freshDb().selections) {
  const application = app(selection.applicationId);
  if (selection.submittedForApproval) {
    assert(
      stageIndex(application.status) >= stageIndex('approval'),
      `submitted selection ${selection.selectionId} sits at "${application.status}"`
    );
  }
}
pass('every submitted selection sits at the approval stage or later');

for (const record of freshDb().shortlistings) {
  const application = app(record.applicationId);
  assert(
    application.status === 'rejected' ||
      application.status === 'on_hold' ||
      stageIndex(application.status) >= stageIndex('shortlisted'),
    `shortlisting ${record.shortlistingId} belongs to an application at "${application.status}"`
  );
}
pass('every shortlisting belongs to an application at the shortlist stage or later');

for (const record of freshDb().screenings) {
  const application = app(record.applicationId);
  assert(
    application.status === 'rejected' ||
      application.status === 'on_hold' ||
      stageIndex(application.status) >= stageIndex('under_screening'),
    `screening ${record.screeningId} belongs to an application at "${application.status}"`
  );
}
pass('every screening belongs to an application at the screening stage or later');

function databaseJoinings(joiningId) {
  return mockBackend
    .readDatabase()
    .joinings.find((item) => item.joiningId === joiningId);
}

function readReady(joining) {
  return joining;
}

/* ------------------------------------------------------------------
   2. Full workflow on a fresh application
------------------------------------------------------------------ */
const applicationId = 'APP-0004'; // applied, Senior Data Analyst role

await applications.moveToScreening(applicationId, { remarks: 'workflow check' });
await screening.saveScreeningDecision(applicationId, {
  status: 'passed',
  score: 84,
  hrRemarks: 'workflow check',
});
await shortlisting.shortlistCandidate(applicationId, { remarks: 'workflow check' });
const interview = await interviews.scheduleInterview({
  applicationId,
  round: 'technical',
  interviewer: 'Workflow Interviewer',
  scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
  mode: 'online',
  meetingLink: 'https://meet.example.com/workflow',
  notes: 'workflow check',
});
await interviews.submitFeedback(interview.interviewId, {
  technicalKnowledge: 4,
  communicationSkills: 4,
  problemSolving: 4,
  overallRating: 4,
  remarks: 'workflow check feedback',
  recommendation: 'recommended',
});
pass('application reaches the interview stage with feedback');

/* The completed round must move the application into the final selection stage. */
const afterFeedback = mockBackend
  .readDatabase()
  .applications.find((item) => item.applicationId === applicationId);
assert(
  afterFeedback.status === 'final_selection',
  `application should be at the final selection stage, got "${afterFeedback.status}"`
);
pass('the completed interview moves the application to the final selection stage');

/* Focused regression: applied-only applications must not have screening records. */
const seededDb = mockBackend.readDatabase();
const appNow = (id) => seededDb.applications.find((item) => item.applicationId === id);
const scr = seededDb.screenings;
const appliedOnly = scr.filter((item) => {
  const application = appNow(item.applicationId);
  return application && application.status === 'applied';
});
assert(appliedOnly.length === 0, 'no screening record may exist for an applied-only application');
pass('applied-only applications never enter the screening queue');

/* The application must be moved to final selection before a decision. */
try {
  await finalSelection.recordDecision(applicationId, { decision: 'selected', remarks: 'x' });
  fail('final selection decision should require the final selection stage');
} catch (error) {
  pass('final selection decision is blocked before the final selection stage');
}

await finalSelection.recordDecision(applicationId, {
  decision: 'selected',
  remarks: 'workflow check decision',
});
const approval = await finalSelection.submitForApproval(applicationId, {
  remarks: 'workflow check approval',
});
pass('HR decision is recorded and submitted for admin approval');

await approvals.decideApproval(approval.approvalId, {
  status: 'approved',
  remarks: 'workflow check approval decision',
});
pass('administrator approves the hiring recommendation');

const offer = await offers.createOffer({
  applicationId,
  designation: 'Data Analyst',
  department: 'Finance',
  employmentType: 'Full-time',
  salaryPackage: 1500000,
  joiningDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
});
pass('offer is created after the approval');

await offers.sendOffer(offer.offerId);
await offers.recordOfferResponse(offer.offerId, { response: 'accepted' });
pass('offer is sent and the acceptance is recorded');

const joiningRecord = await joining.startJoining(offer.offerId);
pass('joining record is opened for the accepted offer');

/* The joining record must not be completable yet. */
try {
  await joining.markJoined(joiningRecord.joiningId);
  fail('markJoined should be blocked while mandatory requirements are missing');
} catch (error) {
  assert(/cannot be marked as joined yet/i.test(error.message), 'unexpected blocking message');
  pass('markJoined is blocked while mandatory documents or checklist items are open');
}

const identityDoc = await joining.addDocument(joiningRecord.joiningId, {
  type: 'identity',
  fileName: 'Identity_Proof.pdf',
});
const degreeDoc = await joining.addDocument(joiningRecord.joiningId, {
  type: 'degree',
  fileName: 'Degree_Certificate.pdf',
});
const bankDoc = await joining.addDocument(joiningRecord.joiningId, {
  type: 'bank',
  fileName: 'Bank_Details.pdf',
});
const emergencyDoc = await joining.addDocument(joiningRecord.joiningId, {
  type: 'emergency_contact',
  fileName: 'Emergency_Contact.pdf',
});
await joining.verifyDocument(joiningRecord.joiningId, identityDoc.documentId, {
  verified: true,
  remarks: 'workflow check',
});
await joining.verifyDocument(joiningRecord.joiningId, degreeDoc.documentId, {
  verified: true,
  remarks: 'workflow check',
});
await joining.verifyDocument(joiningRecord.joiningId, bankDoc.documentId, { verified: true });
await joining.verifyDocument(joiningRecord.joiningId, emergencyDoc.documentId, {
  verified: true,
});
pass('mandatory joining documents are submitted and verified');

/* Complete and verify every mandatory checklist item. */
const checklistComplete = [
  'identity',
  'address',
  'degree',
  'marksheets',
  'previous_employment',
  'bank',
  'emergency_contact',
  'employment_details',
  'joining_date',
  'offer_acceptance',
];
for (const key of checklistComplete) {
  await joining.setChecklistStatus(joiningRecord.joiningId, key, 'verified', 'workflow check');
}
pass('mandatory joining checklist is complete and verified');

const readyToJoin = readReady(databaseJoinings(joiningRecord.joiningId));
assert(
  readyToJoin.status === 'ready_to_join' || readyToJoin.status === 'verification_in_progress',
  `expected ready_to_join, got ${readyToJoin.status}`
);
pass('the joining record automatically reaches the ready_to_join milestone');

await joining.markJoined(joiningRecord.joiningId);
pass('candidate is marked as joined');

const prepared = await joining.prepareEmployeeHandover(joiningRecord.joiningId);
assert(prepared.handover.status === 'ready_for_review', 'handover should be ready_for_review');
assert(prepared.validation.valid, 'payload should be valid');
assert(prepared.payload.candidateId === 'CAND-0004', 'candidateId missing from payload');
assert(prepared.payload.applicationId === applicationId, 'applicationId missing from payload');
assert(prepared.payload.employee.fullName === 'Rohit Kulkarni', 'full name missing');
assert(prepared.payload.employee.email === 'rohit.kulkarni@example.com', 'email missing');
assert(prepared.payload.employee.designation, 'designation missing');
assert(prepared.payload.employee.department === 'Finance', 'department missing');
pass('employee handover payload is prepared with candidate and application references');

/* Duplicate import prevention: an imported record cannot be imported again. */
const preImportJoining = mockBackend
  .readDatabase()
  .joinings.find((item) => item.joiningId === joiningRecord.joiningId);
await employeeService.createEmployee({
  fullName: 'Rohit Kulkarni duplicate',
  email: 'rohit.kulkarni@example.com',
  contactNumber: '9999999999',
  department: 'Finance',
  designation: 'Data Analyst',
  joiningDate: new Date().toISOString().slice(0, 10),
  employmentType: 'Full-time',
});
let duplicateError = null;
try {
  await joining.importEmployeeToDatabank(joiningRecord.joiningId);
} catch (error) {
  duplicateError = error;
}
assert(
  duplicateError && /already exists in the Employee Databank/i.test(duplicateError.message),
  'a duplicate email in the databank must block the import'
);
pass('a duplicate employee email in the databank blocks the import');

const failedJoining = mockBackend
  .readDatabase()
  .joinings.find((item) => item.joiningId === joiningRecord.joiningId);
assert(failedJoining.handover.status === 'import_failed', 'failed import must be marked import_failed');
pass('failed import is recorded as import_failed');

/* Clean the duplicate and retry to confirm a successful import afterwards. */
const databankEmployees = await employeeService.getEmployees();
const duplicate = databankEmployees.find(
  (employee) => employee.email === 'rohit.kulkarni@example.com'
);
await employeeService.deleteEmployee(duplicate.id);
const importResult = await joining.importEmployeeToDatabank(joiningRecord.joiningId);
assert(importResult.status === 'imported', 'import should succeed after the duplicate is removed');
assert(importResult.employee?.employeeId, 'databank employee id missing after import');
pass('import succeeds after the duplicate is removed and the record is marked imported');

const importedJoining = mockBackend
  .readDatabase()
  .joinings.find((item) => item.joiningId === joiningRecord.joiningId);
assert(importedJoining.handover.status === 'imported', 'handover should be marked imported');
const importedFromDatabank = (await employeeService.getEmployees()).some(
  (employee) => employee.email === 'rohit.kulkarni@example.com'
);
assert(importedFromDatabank, 'employee was not created in the databank');
pass('employee is present in the existing Employee Databank after the handover');

try {
  await joining.importEmployeeToDatabank(joiningRecord.joiningId);
  fail('an already imported record must not import twice');
} catch (error) {
  pass('duplicate import attempts are rejected');
}

const finalDb = mockBackend.readDatabase();
const finalApp = finalDb.applications.find((item) => item.applicationId === applicationId);
assert(finalApp.status === 'selected', `final status is "${finalApp.status}"`);

/* ------------------------------------------------------------------
   3. Joining rules
------------------------------------------------------------------ */
try {
  await joining.markJoined('JNG-0001');
  fail('joining should require a complete document and checklist set');
} catch (error) {
  pass('joining is blocked while documents or checklist items are open');
}

results.forEach(([status, name]) => console.log(`${status}  ${name}`));
const failures = results.filter(([status]) => status === 'FAIL');
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length) process.exitCode = 1;

