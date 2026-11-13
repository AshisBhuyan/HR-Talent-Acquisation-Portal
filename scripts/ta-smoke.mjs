/**
 * Smoke test for the Talent Acquisition data and service layer.
 * Run with: node scripts/ta-smoke.mjs
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
const candidateApplicationService = (await import(base + 'features/candidate-applications/services/candidateApplicationService.js')).default;
const screeningService = (await import(base + 'features/cv-screening/services/screeningService.js')).default;
const shortlistingService = (await import(base + 'features/shortlisting/services/shortlistingService.js')).default;
const interviewService = (await import(base + 'features/interviews/services/interviewService.js')).default;
const finalSelectionService = (await import(base + 'features/final-selection/services/finalSelectionService.js')).default;
const approvalService = (await import(base + 'features/approvals/services/approvalService.js')).default;
const offerService = (await import(base + 'features/offers/services/offerService.js')).default;
const joiningService = (await import(base + 'features/joining-onboarding/services/joiningService.js')).default;
const reportsService = (await import(base + 'features/reports-analytics/services/reportsService.js')).default;
const candidateToEmployeeService = await import(base + 'services/candidateToEmployeeService.js');
const { formatExperienceYears } = await import(base + 'utils/formatCandidateData.js');
const { filterApplications } = await import(base + 'utils/candidateFilters.js');
const { buildApplicationRows } = await import(base + 'features/candidate-applications/services/candidateApplicationService.js');
const ROUTES = (await import('../src/app/routeConfig.js')).ROUTES;

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (error) {
    results.push(['FAIL', `${name} → ${error.message}`]);
  }
}

async function assertRejects(fn, pattern) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  if (!caught) throw new Error('expected the operation to fail but it succeeded');
  if (pattern && !pattern.test(caught.message)) {
    throw new Error(`unexpected rejection message: ${caught.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const main = async () => {
  await check('seed database contains every collection', () => {
    const db = mockBackend.readDatabase();
    ['candidates', 'jobs', 'applications', 'screenings', 'shortlistings', 'interviews', 'selections', 'approvals', 'offers', 'joinings', 'activities'].forEach(
      (key) => assert(Array.isArray(db[key]) && db[key].length > 0, `missing ${key}`)
    );
  });

  await check('storage key is namespaced', () => {
    assert(store.has('ecometrix:talent-acquisition:v1'), 'talent acquisition key missing');
    assert(!store.has('ecm_mock_database_v1'), 'databank key must not be written');
  });
  await candidateApplicationService.moveToScreening('APP-0004', { remarks: 'smoke test' });
  let db = mockBackend.readDatabase();
  let app = db.applications.find((item) => item.applicationId === 'APP-0004');
  assert(app.status === 'under_screening', 'APP-0004 should be under screening');
  assert(db.screenings.some((item) => item.applicationId === 'APP-0004'), 'screening record missing');
  results.push(['PASS', 'move to screening creates a screening record']);

  await screeningService.saveScreeningDecision('APP-0004', {
    status: 'passed',
    score: 82,
    hrRemarks: 'smoke test remarks',
  });
  await shortlistingService.shortlistCandidate('APP-0004', { remarks: 'smoke shortlist' });
  db = mockBackend.readDatabase();
  app = db.applications.find((item) => item.applicationId === 'APP-0004');
  assert(app.status === 'shortlisted', 'APP-0004 should be shortlisted');
  results.push(['PASS', 'screening decision and shortlisting move the application forward']);

  await interviewService.scheduleInterview({
    applicationId: 'APP-0004',
    round: 'technical',
    interviewer: 'Smoke Interviewer',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    mode: 'online',
    meetingLink: 'https://meet.example.com/smoke',
    notes: 'smoke',
  });
  db = mockBackend.readDatabase();
  const interview = db.interviews.find((item) => item.applicationId === 'APP-0004');
  app = db.applications.find((item) => item.applicationId === 'APP-0004');
  assert(interview, 'interview not created');
  assert(app.status === 'interview', 'application should be in interview stage');
  results.push(['PASS', 'interview scheduling advances the application']);

  await interviewService.submitFeedback(interview.interviewId, {
    technicalKnowledge: 4,
    communicationSkills: 4,
    problemSolving: 3,
    overallRating: 4,
    remarks: 'smoke feedback',
    recommendation: 'recommended',
  });
  results.push(['PASS', 'interview feedback is recorded']);

  // Application cannot skip the approval stage.
  try {
    await offerService.createOffer({
      applicationId: 'APP-0004',
      designation: 'Test Engineer',
      department: 'Engineering',
      employmentType: 'Full-time',
      salaryPackage: 900000,
      joiningDate: '2026-01-01',
    });
    results.push(['FAIL', 'offer should not be created before the approval']);
  } catch (error) {
    assert(
      error.message.includes('approved hiring recommendation'),
      `unexpected error: ${error.message}`
    );
    results.push(['PASS', 'offer creation is blocked before the approval']);
  }

  // Invalid workflow transition is rejected.
  try {
    await candidateApplicationService.moveToScreening('APP-0004', { remarks: 'again' });
    results.push(['FAIL', 'invalid transition should be rejected']);
  } catch (error) {
    results.push(['PASS', 'invalid workflow transition is rejected']);
  }

  // Joining requires an accepted offer.
  try {
    await joiningService.startJoining('OFR-0001');
    results.push(['FAIL', 'joining should require an accepted offer']);
  } catch (error) {
    results.push(['PASS', 'joining requires an accepted offer']);
  }

  const report = await reportsService.getReports({});
  assert(report.summary.totalApplications === 20, 'unexpected application total');
  assert(report.stageDistribution.length === 8, 'unexpected stage count');
  assert(report.byPosition.length > 0, 'position breakdown missing');
  results.push(['PASS', 'reports are derived from the stored records']);

  const handover = candidateToEmployeeService.buildEmployeeHandoverPayload({
    candidate: mockBackend.readDatabase().candidates.find((item) => item.candidateId === 'CAND-0018'),
    application: mockBackend.readDatabase().applications.find((item) => item.applicationId === 'APP-0020'),
    job: mockBackend.readDatabase().jobs.find((item) => item.jobId === 'JOB-1005'),
    offer: mockBackend.readDatabase().offers.find((item) => item.offerId === 'OFR-0003'),
    joining: mockBackend.readDatabase().joinings.find((item) => item.joiningId === 'JNG-0002'),
  });
  assert(handover.employee.fullName === 'Ritu Chandra', 'handover full name is missing');
  assert(handover.applicationId === 'APP-0020', 'handover applicationId is missing');
  assert(handover.candidateId === 'CAND-0018', 'handover candidateId is missing');
  const validation = candidateToEmployeeService.validateEmployeeHandover(handover);
  assert(validation.valid, `handover payload should be valid: ${validation.missing.join(', ')}`);
  results.push(['PASS', 'employee handover payload is built without touching the databank']);

  /* ---------------------------------------------------------------
     Candidate Applications module tests
  --------------------------------------------------------------- */

  const readFresh = () => mockBackend.readDatabase();
  const rowsFor = () => buildApplicationRows(readFresh());

  await check('1. All Applications displays every valid application', () => {
    const rows = rowsFor();
    assert(rows.length === 20, `expected 20 rows, got ${rows.length}`);
    rows.forEach((row) =>
      assert(
        ['applied', 'under_screening', 'shortlisted', 'interview', 'final_selection', 'approval', 'offer', 'joining', 'selected', 'on_hold', 'rejected'].includes(row.status),
        `unexpected status ${row.status}`
      )
    );
  });

  await check('2. Candidate name opens the correct application profile route', () => {
    assert(
      ROUTES.TALENT_APPLICATION_PATTERN === '/hr/talent-acquisition/applications/:applicationId',
      'profile route pattern changed'
    );
    assert(
      `${ROUTES.TALENT_APPLICATIONS}/APP-0001` === '/hr/talent-acquisition/applications/APP-0001',
      'profile URL mismatch'
    );
  });

  await check('3. Candidate profile view shows every required detail', () => {
    const details = candidateApplicationService.getApplicationById('APP-0001');
    return details.then((payload) => {
      assert(payload, 'profile payload missing');
      assert(payload.application.candidateName, 'candidate name missing');
      assert(payload.application.candidateId, 'candidate id missing');
      assert(payload.application.applicationId, 'application id missing');
      assert(payload.application.candidateEmail, 'email missing');
      assert(payload.application.candidatePhone, 'phone missing');
      assert(payload.application.jobTitle, 'position missing');
      assert(payload.application.candidateExperienceYears !== undefined, 'experience missing');
      assert(payload.application.candidateLocation !== undefined, 'location missing');
      assert(payload.application.status === 'under_screening', 'status mismatch');
      assert(typeof payload.application.remarks === 'string', 'HR remark missing');
      assert(typeof payload.application.candidateHasCv === 'boolean', 'CV availability missing');
      assert(Array.isArray(payload.application.timeline), 'recruitment timeline missing');
      assert(payload.candidate && payload.job, 'candidate or job relationship missing');
    });
  });

  await check('4. Experience 0 years displays as Fresher', () => {
    assert(formatExperienceYears(0) === 'Fresher', `got ${formatExperienceYears(0)}`);
  });

  await check('5. Experience 1 year displays as 1 year', () => {
    assert(formatExperienceYears(1) === '1 year', `got ${formatExperienceYears(1)}`);
  });

  await check('6. Experience 2 years displays as 2 years', () => {
    assert(formatExperienceYears(2) === '2 years', `got ${formatExperienceYears(2)}`);
    assert(formatExperienceYears(3) === '3 years', `got ${formatExperienceYears(3)}`);
    assert(formatExperienceYears(2.5) === '2.5 years', `got ${formatExperienceYears(2.5)}`);
  });

  await check('7. Missing experience displays as Not specified', () => {
    assert(formatExperienceYears(undefined) === 'Not specified', 'undefined');
    assert(formatExperienceYears(null) === 'Not specified', 'null');
    assert(formatExperienceYears('not-a-number') === 'Not specified', 'NaN');
  });

  await check('8. Position filtering returns only the matching position', () => {
    const rows = rowsFor();
    const filtered = filterApplications(rows, { jobId: 'JOB-1001' });
    assert(filtered.length > 0, 'expected at least one JOB-1001 application');
    assert(filtered.every((row) => row.jobId === 'JOB-1001'), 'unexpected position leaked');
    const positions = new Set(rows.map((row) => row.jobId));
    assert(positions.size > 1, 'position filter cannot be derived from a single job');
  });

  await check('9. Position and status filters work together', () => {
    const rows = rowsFor();
    const filtered = filterApplications(rows, { jobId: 'JOB-1001', status: 'under_screening' });
    assert(filtered.length > 0, 'combined filter returned nothing');
    assert(
      filtered.every((row) => row.jobId === 'JOB-1001' && row.status === 'under_screening'),
      'combined filter returned non-matching rows'
    );
  });

  await check('10. Search works with all filter modes', () => {
    const rows = rowsFor();
    const candidates = ['APP-0001', 'APP-0007', 'CAND-0001', 'ananya'];
    for (const query of candidates) {
      const withPosition = filterApplications(rows, { jobId: 'JOB-1001', search: query });
      const withStatus = filterApplications(rows, { status: 'under_screening', search: query });
      const withDates = filterApplications(rows, { dateFrom: '2020-01-01', dateTo: '2099-12-31', search: query });
      assert(
        withPosition.every((row) => filterApplications([row], { search: query }).length === 1),
        `search ${query} with position filter mismatch`
      );
      assert(withStatus.length <= rows.length, 'status search inconsistent');
      assert(withDates.length >= 0, 'date search inconsistent');
    }
    const hits = filterApplications(rows, { search: 'ananya' });
    assert(hits.length > 0, 'search should find a name');
  });

  await check('11. Clear filters restores every application', () => {
    const rows = rowsFor();
    assert(filterApplications(rows, {}).length === rows.length, 'reset lost rows');
    const onlyOne = filterApplications(rows, { search: 'ananya' });
    assert(onlyOne.length < rows.length, 'search should narrow the list');
  });

  await check('12. HR can add a remark without changing the application status', async () => {
    const updated = await candidateApplicationService.addRemark('APP-0007', {
      remarks: 'Smoke test remark for the next round.',
    });
    assert(updated.remarks === 'Smoke test remark for the next round.', 'remark not saved');
    assert(updated.status === 'final_selection', 'remark must not change the application status');
    assert(
      updated.timeline.some(
        (entry) => entry.event === 'Remark' && entry.note.includes('Smoke test remark')
      ),
      'remark not written to the activity history'
    );
    const fresh = readFresh().applications.find((item) => item.applicationId === 'APP-0007');
    assert(fresh.remarks === 'Smoke test remark for the next round.', 'remark did not persist');
  });

  await check('13. Put on Hold updates the application status and records hold metadata', async () => {
    const updated = await candidateApplicationService.putOnHold('APP-0001', {
      remarks: 'Candidate requires further evaluation.',
    });
    assert(updated.status === 'on_hold', 'application not on hold');
    assert(updated.statusBeforeHold === 'under_screening', 'previous status not stored');
    assert(updated.holdReason === 'Candidate requires further evaluation.', 'hold reason not stored');
    assert(updated.heldAt, 'heldAt not stored');
    assert(updated.heldBy, 'heldBy not stored');
    assert(
      updated.timeline.some(
        (entry) =>
          entry.event === 'Put On Hold' &&
          entry.previousStatus === 'under_screening' &&
          entry.status === 'on_hold' &&
          entry.note === 'Candidate requires further evaluation.' &&
          entry.user
      ),
      'hold entry missing from the activity history'
    );
  });

  await check('14. Held applications remain visible in All Applications', () => {
    const rows = rowsFor();
    const held = rows.find((row) => row.applicationId === 'APP-0001');
    assert(held, 'held application missing from All Applications');
    assert(held.status === 'on_hold', 'held application should display the On Hold badge status');
  });

  await check('15. Held applications appear in the On Hold filter', () => {
    const rows = rowsFor();
    const filtered = filterApplications(rows, { status: 'on_hold' });
    assert(
      filtered.length > 0 && filtered.some((row) => row.applicationId === 'APP-0001'),
      'held application missing from the On Hold filter'
    );
  });

  await check('16. Held candidates cannot enter screening', async () => {
    await assertRejects(
      () => candidateApplicationService.moveToScreening('APP-0001', { remarks: 'should fail' }),
      /on hold/i
    );
    await assertRejects(
      () => screeningService.saveScreeningDecision('APP-0001', { status: 'passed', score: 80 }),
      /on hold/i
    );
    const rows = await screeningService.getQueue();
    assert(
      rows.every((entry) => entry.application.status !== 'on_hold'),
      'held candidate leaked into the screening queue'
    );
  });

  await check('17. Held candidates cannot enter shortlisting, interviews, offers or joining', async () => {
    await candidateApplicationService.putOnHold('APP-0003', { remarks: 'hold for test' });
    await assertRejects(
      () => shortlistingService.shortlistCandidate('APP-0003', { remarks: 'should fail' }),
      /on hold|shortlist/i
    );
    await assertRejects(
      () =>
        interviewService.scheduleInterview({
          applicationId: 'APP-0003',
          round: 'hr',
          interviewer: 'X',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          mode: 'online',
          meetingLink: 'https://meet.example.com/hold',
        }),
      /on hold/i
    );
    await candidateApplicationService.putOnHold('APP-0007', { remarks: 'hold for selection test' });
    await assertRejects(
      () =>
        finalSelectionService.recordDecision('APP-0007', {
          decision: 'selected',
          remarks: 'should fail',
        }),
      /on hold/i
    );
    await candidateApplicationService.putOnHold('APP-0016', { remarks: 'hold for offer test' });
    await assertRejects(
      () =>
        offerService.createOffer({
          applicationId: 'APP-0016',
          designation: 'Data Analyst',
          department: 'Finance',
          employmentType: 'Full-time',
          salaryPackage: 900000,
          joiningDate: '2026-02-01',
        }),
      /on hold/i
    );
    await candidateApplicationService.putOnHold('APP-0019', { remarks: 'hold for joining test' });
    await assertRejects(
      () => joiningService.startJoining('OFR-0002'),
      /on hold/i
    );
    await candidateApplicationService.resumeApplication('APP-0019', { remarks: 'resume after joining test' });
  });

  await check('18. Resume restores the previous application status', async () => {
    const resumed = await candidateApplicationService.resumeApplication('APP-0001', {
      remarks: 'Ready to progress.',
    });
    assert(resumed.status === 'under_screening', `expected under_screening, got ${resumed.status}`);
    assert(resumed.statusBeforeHold === null, 'statusBeforeHold not cleared');
    assert(resumed.heldAt === null, 'heldAt not cleared');
    const resumed3 = await candidateApplicationService.resumeApplication('APP-0003', {});
    assert(resumed3.status === 'shortlisted', `expected shortlisted, got ${resumed3.status}`);
    const resumedDefault = await candidateApplicationService.putOnHold('APP-0009', {
      remarks: 'hold with no previous',
    });
    await candidateApplicationService.resumeApplication('APP-0009', {});
    const app9 = readFresh().applications.find((item) => item.applicationId === 'APP-0009');
    assert(app9.status === 'applied', `expected applied fallback, got ${app9.status}`);
  });

  await check('19. Hold and Resume persist after refresh', async () => {
    await candidateApplicationService.putOnHold('APP-0002', { remarks: 'persistence check' });
    const held = readFresh().applications.find((item) => item.applicationId === 'APP-0002');
    assert(held.status === 'on_hold', 'hold did not persist');
    await candidateApplicationService.resumeApplication('APP-0002', { remarks: 'resume persistence check' });
    const resumed = readFresh().applications.find((item) => item.applicationId === 'APP-0002');
    assert(resumed.status === 'under_screening', 'resume did not persist');
  });

  await check('20. Hold history and remarks are retained', async () => {
    await candidateApplicationService.putOnHold('APP-0010', { remarks: 'kept reason' });
    const held = readFresh().applications.find((item) => item.applicationId === 'APP-0010');
    assert(
      held.timeline.some(
        (entry) =>
          entry.event === 'Put On Hold' &&
          entry.note === 'kept reason' &&
          entry.previousStatus === 'applied' &&
          entry.status === 'on_hold'
      ),
      'hold history entry missing'
    );
    assert(held.holdReason === 'kept reason', 'hold reason not retained');
    await candidateApplicationService.resumeApplication('APP-0010', { remarks: 'restore' });
    const resumed = readFresh().applications.find((item) => item.applicationId === 'APP-0010');
    assert(
      resumed.timeline.some(
        (entry) => entry.event === 'Resumed' && entry.status === 'applied'
      ),
      'resume history entry missing'
    );
  });

  await check('21. Services reject invalid workflow transitions', async () => {
    await assertRejects(
      () => candidateApplicationService.moveToScreening('APP-0004', { remarks: 'again' }),
      /applied state|already been transferred/i
    );
    await assertRejects(() => candidateApplicationService.resumeApplication('APP-0004', {}), /on hold/i);
    await assertRejects(
      () => candidateApplicationService.putOnHold('APP-0013', { remarks: 'x' }),
      /rejected/i
    );
  });

  await check('22. Screening and interview workflows continue to work after the hold guard', async () => {
    await candidateApplicationService.resumeApplication('APP-0007', { remarks: 'round flow check' });
    const app4Interview = readFresh().interviews.find((item) => item.applicationId === 'APP-0004');
    assert(app4Interview, 'APP-0004 interview missing');
    const submitted = await interviewService.submitFeedback(app4Interview.interviewId, {
      technicalKnowledge: 4,
      communicationSkills: 4,
      problemSolving: 4,
      overallRating: 4,
      remarks: 'guard check feedback',
      recommendation: 'recommended',
    });
    assert(submitted.status === 'completed', 'feedback did not complete the interview');
    const app4 = readFresh().applications.find((item) => item.applicationId === 'APP-0004');
    assert(
      app4.status === 'final_selection',
      `expected APP-0004 to reach final_selection, got ${app4.status}`
    );
  });

  await check('23. Ranking is position-wise and descending by AI score', () => {
    const db = readFresh();
    const apps = db.applications.filter((item) => item.status === 'under_screening');
    const byPosition = new Map();
    for (const application of apps) {
      const screening = db.screenings.find(
        (item) => item.applicationId === application.applicationId
      );
      if (Number.isFinite(Number(screening?.score))) {
        const key = application.jobId;
        if (!byPosition.has(key)) byPosition.set(key, []);
        byPosition.get(key).push({ application, score: Number(screening.score) });
      }
    }
    let ranked = 0;
    for (const group of byPosition.values()) {
      const sorted = [...group].sort((a, b) => b.score - a.score);
      for (let index = 1; index < sorted.length; index += 1) {
        assert(
          sorted[index - 1].score >= sorted[index].score,
          'scores must be in descending order within a position'
        );
      }
      ranked += sorted.length;
    }
    assert(ranked > 0, 'expected at least one ranked under_screening candidate');
  });

  const report2 = await reportsService.getReports({});
  assert(report2.summary.totalApplications === 20, 'unexpected application total after hold tests');
  results.push(['PASS', 'reports stay consistent after hold and resume actions']);
  await candidateApplicationService.resumeApplication('APP-0016', { remarks: 'restore for offer tests' });

  assert(!store.has('ecm_mock_database_v1'), 'databank storage must stay untouched');

  results.forEach(([status, name]) => console.log(`${status}  ${name}`));
  const failures = results.filter(([status]) => status === 'FAIL');
  console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
  if (failures.length) process.exitCode = 1;
};

await main();
