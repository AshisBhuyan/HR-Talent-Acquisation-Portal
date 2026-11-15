/**
 * Regression probes for the six P0 fixes.
 * Run with: node scripts/smoke-p0-fixes.cjs
 *
 * Executes the real module services against an isolated in-memory
 * localStorage seed. The browser database is never touched.
 */
const path = require('path');
const { pathToFileURL } = require('url');

const fileUrl = (relative) => pathToFileURL(path.join(process.cwd(), relative)).href;
process.chdir(path.join(__dirname, '..'));

const storage = new Map();
const localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

global.window = {
  localStorage,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  location: { origin: 'http://localhost:4173' },
};
global.localStorage = localStorage;

const results = [];
const ok = (name, cond) => {
  results.push([name, Boolean(cond)]);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
};
const section = (title) => console.log(`\n== ${title} ==`);

(async () => {
  const mockBackend = await import(fileUrl('src/modules/talent-acquisition/services/mockBackend.js'));
  const helper = await import(fileUrl('src/modules/talent-acquisition/utils/checklist.js'));
  const approvalService = (await import(
    fileUrl('src/modules/talent-acquisition/features/approvals/services/approvalService.js')
  )).default;
  const offerService = (await import(
    fileUrl('src/modules/talent-acquisition/features/offers/services/offerService.js')
  )).default;
  const screeningService = (await import(
    fileUrl('src/modules/talent-acquisition/features/cv-screening/services/screeningService.js')
  )).default;
  const shortlistingService = (await import(
    fileUrl('src/modules/talent-acquisition/features/shortlisting/services/shortlistingService.js')
  )).default;
  const applicationService = (await import(
    fileUrl(
      'src/modules/talent-acquisition/features/candidate-applications/services/candidateApplicationService.js'
    )
  )).default;
  const documentRequestService = (await import(
    fileUrl(
      'src/modules/talent-acquisition/features/document-requests/services/documentRequestService.js'
    )
  )).default;
  const documentRequestModule = await import(
    fileUrl(
      'src/modules/talent-acquisition/features/document-requests/services/documentRequestService.js'
    )
  );
  const employeeHandover = await import(
    fileUrl('src/modules/talent-acquisition/services/candidateToEmployeeService.js')
  );
  const { createDefaultChecklist, MANDATORY_CHECKLIST_KEYS } = await import(
    fileUrl('src/modules/talent-acquisition/constants/joiningStatus.js')
  );

  /* ------------------------- P0-1 Approval reject -> resubmit -> approve -> offer */
  section('P0-1 Approval reject -> resubmit -> approve -> offer');
  {
    const seed = mockBackend.resetMockDatabase();
    const before = seed.applications.find((item) => item.applicationId === 'APP-0017');
    const approvalBefore = seed.approvals.find((item) => item.applicationId === 'APP-0017');
    ok('seed: APP-0017 awaits approval', before?.status === 'approval');
    ok('seed: APR-0001 pending', approvalBefore?.status === 'pending');

    // 1. Admin rejects.
    await approvalService.decideApproval('APR-0001', {
      status: 'rejected',
      remarks: 'Compensation band too high.',
    });
    let db = mockBackend.readDatabase();
    ok('reject: application is rejected', db.applications.find((a) => a.applicationId === 'APP-0017').status === 'rejected');
    ok('reject: approval is rejected', db.approvals.find((a) => a.applicationId === 'APP-0017').status === 'rejected');
    const rejectionDecision = db.approvals.find((a) => a.applicationId === 'APP-0017');
    ok('reject: decision metadata kept', Boolean(rejectionDecision.decidedAt && rejectionDecision.decidedBy));
    ok(
      'reject: decision preserved in history',
      (rejectionDecision.history || []).some((entry) => entry.action === 'Rejected')
    );

    // 2. Offer must be blocked for the rejected candidate.
    let blocked = false;
    try {
      await offerService.createOffer({ applicationId: 'APP-0017', salaryPackage: 100000 });
    } catch {
      blocked = true;
    }
    ok('reject: offer creation blocked while rejected', blocked);

    // 3. HR resubmits for approval.
    await approvalService.resubmitForApproval('APP-0017', { remarks: 'Package aligned.' });
    db = mockBackend.readDatabase();
    const afterResubmit = db.approvals.find((a) => a.applicationId === 'APP-0017');
    ok('resubmit: approval is pending again', afterResubmit?.status === 'pending');
    ok('resubmit: application returns to approval', db.applications.find((a) => a.applicationId === 'APP-0017').status === 'approval');
    ok(
      'resubmit: history keeps the rejection entry',
      (afterResubmit.history || []).some((entry) => entry.action === 'Rejected') &&
        (afterResubmit.history || []).some((entry) => entry.action === 'Resubmitted for Approval')
    );
    const pendingCount = db.approvals.filter((a) => a.applicationId === 'APP-0017').length;
    ok('resubmit: no duplicate approval records', pendingCount === 1);

    // 4. Admin approves the resubmitted application.
    await approvalService.decideApproval('APR-0001', {
      status: 'approved',
      remarks: 'Approved after rework.',
    });
    db = mockBackend.readDatabase();
    ok('approve: approval recorded', db.approvals.find((a) => a.applicationId === 'APP-0017').status === 'approved');
    ok('approve: application still in approval', db.applications.find((a) => a.applicationId === 'APP-0017').status === 'approval');

    // 5. Offer creation succeeds.
    const offer = await offerService.createOffer({
      applicationId: 'APP-0017',
      designation: 'Partner',
      department: 'Finance',
      employmentType: 'Full-time',
      salaryPackage: 1500000,
      joiningDate: '2026-12-15',
      expiryDate: '2027-01-15',
    });
    db = mockBackend.readDatabase();
    ok('offer: draft offer created', Boolean(offer?.offerId));
    ok('offer: application moved to offer stage', db.applications.find((a) => a.applicationId === 'APP-0017').status === 'offer');
    ok(
      'offer: recorded activity',
      db.activities.some((a) => a.applicationId === 'APP-0017')
    );

    // Permanent rejection (no resubmission) stays ineligible.
    await approvalService.decideApproval('APR-0002', {
      status: 'rejected',
      remarks: 'Role on hold.',
    });
    let permanentBlocked = false;
    try {
      await offerService.createOffer({ applicationId: 'APP-0016', salaryPackage: 100000 });
    } catch {
      permanentBlocked = true;
    }
    ok('approve: permanently rejected application cannot get an offer', permanentBlocked);
    db = mockBackend.readDatabase();
    ok('approve: rejected application keeps the rejected status', db.applications.find((a) => a.applicationId === 'APP-0016').status === 'rejected');
  }

  /* ------------------------- P0-2 Screening Passed persists remarks */
  section('P0-2 Screening Passed persists HR remarks');
  {
    mockBackend.resetMockDatabase();
    const db = mockBackend.readDatabase();
    const entry = db.applications.find((a) => a.status === 'under_screening');
    ok('seed: an under_screening application exists', Boolean(entry));
    await screeningService.saveScreeningDecision(entry.applicationId, {
      status: 'passed',
      score: 77,
      hrRemarks: 'Remarks persisted probe',
    });
    const after = mockBackend.readDatabase();
    const screening = after.screenings.find((s) => s.applicationId === entry.applicationId);
    ok('passed: status saved', screening.status === 'passed');
    ok('passed: remarks persisted', screening.hrRemarks === 'Remarks persisted probe');
    ok(
      'passed: application screeningStatus synced',
      after.applications.find((a) => a.applicationId === entry.applicationId).screeningStatus === 'passed'
    );
    // The page handler falls back to the stored remarks when HR confirms
    // Passed without typing a remark (remarks argument empty). The service
    // itself falls back to the stored value when no remark is provided at
    // all, which is the contract the page relies on.
    await screeningService.saveScreeningDecision(entry.applicationId, {
      status: 'passed',
      score: 77,
    });
    const kept = mockBackend.readDatabase().screenings.find((s) => s.applicationId === entry.applicationId);
    ok('passed: stored remarks survive a missing remark argument', kept.hrRemarks === 'Remarks persisted probe');
  }

  /* ------------------------- P0-3 Candidate document submission persistence */
  section('P0-3 Candidate document submission: persisted submitted state');
  {
    mockBackend.resetMockDatabase();
    let token;
    const created = mockBackend.mutateDatabase((database) => {
      // OFR-0003: accepted, every seeded document is verified, so staging
      // the mandatory requirements cleanly reaches the submitted state.
      const offer = database.offers.find((item) => item.offerId === 'OFR-0003');
      return documentRequestModule.ensureDocumentRequestForOffer(database, offer, {
        user: 'probe',
      });
    });
    token = created.request.token;
    ok('request: document request created', Boolean(token));

    for (const type of ['identity', 'address', 'educational_certificates', 'bank']) {
      await documentRequestService.stageDocument(token, {
        type,
        fileName: `${type}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 100,
        storageKey: `probe:${type}`,
      });
    }
    const result = await documentRequestService.submitDocuments(token, { user: 'probe' });
    console.log(`      requestStatus after submit: ${result.requestStatus}`);
    ok('submit: documents accepted', result.documentsSubmitted === 4);
    ok('submit: request persisted as submitted', result.requestStatus === 'submitted');

    const portal = await documentRequestService.getPortalState(token);
    ok('reopen: persisted state is submitted (confirmation renders)', portal.request.status === 'submitted');
    ok('reopen: persisted submittedAt present', Boolean(portal.request.submittedAt));

    // Refresh/reload path used by the page: getPortalState is the single source
    // of hydration, and it must not report ready-to-submit.
    ok('reopen: no staged documents remain', Object.keys(portal.request.stagedDocuments || {}).length === 0);
  }

  /* ------------------------- P0-4 Shortlist hold visibility + resume */
  section('P0-4 Shortlisted candidate on hold stays visible and resumable');
  {
    mockBackend.resetMockDatabase();
    const db = mockBackend.readDatabase();
    const target = db.applications.find((a) => a.status === 'under_screening');
    // Make the screening passed so shortlisting accepts the candidate.
    await screeningService.saveScreeningDecision(target.applicationId, {
      status: 'passed',
      score: 88,
      hrRemarks: 'probe',
    });
    await shortlistingService.shortlistCandidate(target.applicationId, { remarks: 'Probe shortlist' });
    await shortlistingService.putOnHold(target.applicationId, { remarks: 'Probe hold' });
    let state = mockBackend.readDatabase();
    const heldApp = state.applications.find((a) => a.applicationId === target.applicationId);
    const heldShortlist = state.shortlistings.find((s) => s.applicationId === target.applicationId);
    ok('hold: application on hold', heldApp.status === 'on_hold');
    ok('hold: shortlist record on hold', heldShortlist?.status === 'on_hold');
    // useShortlisting builds its rows from shortlistings + applications and no
    // longer drops on-hold applications; verify the source data is present and
    // the resume action restores both records.
    ok(
      'hold: shortlist record still present for the on-hold views',
      state.shortlistings.some((s) => s.applicationId === target.applicationId && s.status === 'on_hold')
    );
    await applicationService.resumeApplication(target.applicationId, { remarks: 'Probe resume' });
    state = mockBackend.readDatabase();
    const resumedApp = state.applications.find((a) => a.applicationId === target.applicationId);
    const resumedShortlist = state.shortlistings.find((s) => s.applicationId === target.applicationId);
    ok('resume: application back to shortlisted', resumedApp.status === 'shortlisted');
    ok('resume: shortlist record back to shortlisted', resumedShortlist?.status === 'shortlisted');
    ok('resume: shortlist remarks preserved', resumedShortlist?.remarks === 'Probe hold');
  }

  /* ------------------------- P0-5/P0-6 Shared checklist satisfaction rules */
  section('P0-5/P0-6 Checklist satisfaction rules (UI === service)');
  {
    const summarizeChecklist = helper.summarizeChecklist;
    const isSatisfied = helper.isChecklistItemSatisfied;
    const mandatoryOk = helper.areMandatoryChecklistItemsSatisfied;

    const base = createDefaultChecklist();
    const summaryFresh = summarizeChecklist(base);
    console.log(`      fresh default checklist summary: ${JSON.stringify(summaryFresh)}`);
    ok('fresh: 0 of N complete', summaryFresh.completed === 0 && summaryFresh.mandatoryCompleted === 0);
    ok('fresh: percent is 0', summaryFresh.percent === 0);

    const allVerified = base.map((item) => ({ ...item, status: 'verified' }));
    const summaryVerified = summarizeChecklist(allVerified);
    ok('all verified: complete', summaryVerified.completed === summaryVerified.total && summaryVerified.percent === 100);
    ok('all verified: mandatory complete', mandatoryOk(allVerified));

    const oneMandatoryNa = base.map((item) =>
      item.key === 'identity' ? { ...item, status: 'not_applicable' } : { ...item, status: 'verified' }
    );
    ok('mandatory N/A: NOT satisfied for mandatory', !mandatoryOk(oneMandatoryNa));
    const naItem = oneMandatoryNa.find((item) => item.key === 'identity');
    ok('mandatory N/A: helper agrees', isSatisfied(naItem) === false);

    const optionalNa = base.map((item) =>
      item.key === 'photograph' ? { ...item, status: 'not_applicable' } : { ...item, status: 'verified' }
    );
    ok('optional N/A: satisfied', isSatisfied(optionalNa.find((item) => item.key === 'photograph')));
    ok('optional N/A: mandatory unaffected', mandatoryOk(optionalNa));

    // Service gate (markJoined) agrees with the helper: doc + checklist mix.
    const joining = {
      documents: [
        { type: 'identity', status: 'verified', isCurrent: true, fileName: 'id.pdf' },
        { type: 'degree', status: 'verified', isCurrent: true, fileName: 'degree.pdf' },
        { type: 'bank', status: 'verified', isCurrent: true, fileName: 'bank.pdf' },
      ],
      checklist: allVerified,
    };
    const missingAllVerified = employeeHandover.getMandatoryIncomplete(joining);
    ok('service: fully verified checklist+documents passes', missingAllVerified.length === 0);
    const joiningNa = { ...joining, checklist: oneMandatoryNa };
    const missingNa = employeeHandover.getMandatoryIncomplete(joiningNa);
    ok('service: mandatory N/A blocks markJoined', missingNa.length === 1 && /Identity document/i.test(missingNa[0]));

    console.log(`      mandatory keys: ${MANDATORY_CHECKLIST_KEYS.length}`);
  }

  const failures = results.filter(([, pass]) => !pass).length;
  console.log(`\n${results.length - failures}/${results.length} probes passed.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error('\nProbe crashed:', error);
  process.exit(1);
});
