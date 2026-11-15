/**
 * Focused regression probes for the document-request status scope fix.
 * Run with: node scripts/smoke-document-request-scope.cjs
 *
 * Executes the real document-request and joining services against an isolated
 * in-memory localStorage seed. The browser database is never touched.
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
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const mockBackend = await import(fileUrl('src/modules/talent-acquisition/services/mockBackend.js'));
  const documentRequestModule = await import(
    fileUrl(
      'src/modules/talent-acquisition/features/document-requests/services/documentRequestService.js'
    )
  );
  const documentRequestService = documentRequestModule.default;
  const { deriveRequestStatus, ensureDocumentRequestForOffer } = documentRequestModule;
  const joiningService = (
    await import(
      fileUrl(
        'src/modules/talent-acquisition/features/joining-onboarding/services/joiningService.js'
      )
    )
  ).default;
  const { createDocumentRequestRequirements, DOCUMENT_REQUEST_STATUS } = await import(
    fileUrl('src/modules/talent-acquisition/constants/documentRequestRules.js')
  );

  const SUBMITTED = DOCUMENT_REQUEST_STATUS.SUBMITTED;
  const REQUESTED = DOCUMENT_REQUEST_STATUS.REQUESTED;
  const RESUBMISSION = DOCUMENT_REQUEST_STATUS.RESUBMISSION_REQUIRED;

  /* ------------------------------------------------------------------ */
  /* Pure calculation tests                                              */
  /* ------------------------------------------------------------------ */
  section('deriveRequestStatus scope');

  const requirements = createDocumentRequestRequirements();

  const baseDocs = [
    { type: 'identity', status: 'verified' },
    { type: 'address', status: 'submitted' },
    { type: 'educational_certificates', status: 'submitted' },
    { type: 'bank', status: 'submitted' },
  ];

  // Case 1: unrelated marksheets flagged on the joining record.
  const unrelatedResubmission = [
    ...baseDocs,
    { type: 'marksheets', status: 'resubmission_required' },
  ];
  ok(
    '1. unrelated marksheets resubmission does not block the request',
    deriveRequestStatus(requirements, unrelatedResubmission) === SUBMITTED
  );

  // Case 2: a requested identity document requires resubmission.
  ok(
    '2. requested identity resubmission blocks the request',
    deriveRequestStatus(requirements, [
      { type: 'identity', status: 'resubmission_required' },
      { type: 'address', status: 'submitted' },
      { type: 'educational_certificates', status: 'submitted' },
      { type: 'bank', status: 'submitted' },
      { type: 'marksheets', status: 'resubmission_required' },
    ]) === RESUBMISSION
  );

  // Case 3: the requested educational certificate requires resubmission.
  ok(
    '3. requested educational certificate resubmission blocks the request',
    deriveRequestStatus(requirements, [
      { type: 'identity', status: 'verified' },
      { type: 'address', status: 'submitted' },
      { type: 'educational_certificates', status: 'resubmission_required' },
      { type: 'bank', status: 'submitted' },
    ]) === RESUBMISSION
  );

  // Case 4: superseded (non-current) versions are ignored.
  ok(
    '4. superseded requested document is ignored',
    deriveRequestStatus(requirements, [
      ...baseDocs,
      {
        type: 'identity',
        status: 'resubmission_required',
        isCurrent: false,
        version: 1,
      },
      {
        type: 'educational_certificates',
        status: 'resubmission_required',
        isCurrent: false,
        version: 1,
      },
    ]) === SUBMITTED
  );

  // Case 5: all mandatory requested documents submitted preserves submitted.
  ok(
    '5. all mandatory documents submitted -> submitted',
    deriveRequestStatus(requirements, baseDocs) === SUBMITTED
  );
  ok(
    '5b. mandatory document still pending -> requested',
    deriveRequestStatus(requirements, [
      ...baseDocs.filter((doc) => doc.type !== 'bank'),
      { type: 'bank', status: 'pending' },
    ]) === REQUESTED
  );

  // Case 6: a document belonging to another request is out of scope.
  ok(
    '6. document outside this request requirements is ignored',
    deriveRequestStatus([{ type: 'identity', mandatory: true }], [
      { type: 'identity', status: 'verified' },
      { type: 'address', status: 'resubmission_required' },
      { type: 'marksheets', status: 'resubmission_required' },
    ]) === SUBMITTED
  );

  // Case 7: two requests evaluate independently from their own snapshots.
  const requestA = [{ type: 'identity', mandatory: true }];
  const requestB = [{ type: 'educational_certificates', mandatory: true }];
  ok(
    '7. two requests calculate their own status',
    deriveRequestStatus(requestA, [
      { type: 'identity', status: 'verified' },
      { type: 'educational_certificates', status: 'resubmission_required' },
    ]) === SUBMITTED &&
      deriveRequestStatus(requestB, [
        { type: 'identity', status: 'verified' },
        { type: 'educational_certificates', status: 'resubmission_required' },
      ]) === RESUBMISSION
  );

  // Case 8: candidate A's rejection does not affect candidate B's request.
  ok(
    '8. candidate A rejection leaves candidate B status unchanged',
    deriveRequestStatus(requestA, [{ type: 'identity', status: 'resubmission_required' }]) ===
      RESUBMISSION &&
      deriveRequestStatus(requestB, [{ type: 'educational_certificates', status: 'verified' }]) ===
        SUBMITTED
  );

  /* ------------------------------------------------------------------ */
  /* Seeded OFR-0002 end-to-end scenario via the real services           */
  /* ------------------------------------------------------------------ */
  section('OFR-0002 seeded scenario (JNG-0001, request via service)');

  mockBackend.resetMockDatabase();
  const seed = mockBackend.readDatabase();
  const offer2 = seed.offers.find((offer) => offer.offerId === 'OFR-0002');
  const joining2 = seed.joinings.find((joining) => joining.offerId === 'OFR-0002');
  const originalDocumentIds = (joining2.documents || []).map((doc) => doc.documentId);
  const offerSnapshot = JSON.parse(JSON.stringify(seed.offers));
  const applicationsSnapshot = JSON.parse(
    JSON.stringify(seed.applications.map((app) => [app.applicationId, app.status]))
  );

  ok(
    'seed: OFR-0002 joining has an unrelated current marksheets resubmission',
    (joining2.documents || []).some(
      (doc) =>
        doc.type === 'marksheets' &&
        doc.status === 'resubmission_required' &&
        doc.isCurrent !== false
    )
  );

  const created = mockBackend.mutateDatabase((database) => {
    const offer = database.offers.find((item) => item.offerId === 'OFR-0002');
    return ensureDocumentRequestForOffer(database, offer, { user: 'probe' });
  });
  const token = created.request.token;
  const requestId = created.request.requestId;
  const requirementsSnapshot = JSON.parse(JSON.stringify(created.request.requiredDocuments));

  ok('request: created for the accepted offer', Boolean(token));
  ok(
    'request: initial status is requested',
    mockBackend
      .readDatabase()
      .documentRequests.find((item) => item.requestId === requestId).status === REQUESTED
  );

  // HR rejects the unrelated marksheets document.
  await joiningService.verifyDocument(joining2.joiningId, 'JD-0003', {
    verified: false,
    remarks: 'Marksheets do not match the submitted degree.',
  });

  let database = mockBackend.readDatabase();
  let request = database.documentRequests.find((item) => item.requestId === requestId);
  ok(
    'unrelated marksheets rejection does not force resubmission_required',
    request.status !== RESUBMISSION
  );
  ok(
    'unrelated marksheets rejection keeps the request in requested',
    request.status === REQUESTED
  );
  ok(
    'unrelated document version was updated, not deleted',
    database.joinings
      .find((item) => item.joiningId === joining2.joiningId)
      .documents.some(
        (doc) => doc.documentId === 'JD-0003' && doc.status === 'resubmission_required'
      )
  );
  const docsAfterReject = database.joinings.find(
    (item) => item.joiningId === joining2.joiningId
  ).documents;
  ok(
    'no joining document was deleted by the rejection',
    originalDocumentIds.every((id) =>
      docsAfterReject.some((doc) => doc.documentId === id)
    ) && docsAfterReject.length === originalDocumentIds.length
  );

  // Candidate submits the requested documents through the portal.
  for (const type of ['address', 'educational_certificates', 'bank']) {
    await documentRequestService.stageDocument(token, {
      type,
      fileName: `${type}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 80,
      storageKey: `probe-scope:${type}`,
    });
  }
  const submitted = await documentRequestService.submitDocuments(token, { user: 'Candidate' });
  ok(
    'portal: submit returns submitted despite the unrelated marksheets flag',
    submitted.requestStatus === SUBMITTED
  );

  database = mockBackend.readDatabase();
  request = database.documentRequests.find((item) => item.requestId === requestId);
  ok('portal: persisted request status is submitted', request.status === SUBMITTED);
  const portal = await documentRequestService.getPortalState(token);
  ok('portal: reopening the link shows the submitted state', portal.request.status === SUBMITTED);

  const docsAfterSubmit = database.joinings.find(
    (item) => item.joiningId === joining2.joiningId
  ).documents;
  const supersededBank = docsAfterSubmit.find((doc) => doc.documentId === 'JD-0004');
  ok(
    'versions: the superseded bank document is preserved and marked non-current',
    Boolean(supersededBank) && supersededBank.isCurrent === false
  );
  ok(
    'versions: no document version was deleted (only new versions added)',
    originalDocumentIds.every((id) =>
      docsAfterSubmit.some((doc) => doc.documentId === id)
    ) && docsAfterSubmit.length === originalDocumentIds.length + 3
  );
  ok(
    'integrity: the request requirement snapshot is unchanged',
    deepEqual(request.requiredDocuments, requirementsSnapshot)
  );
  ok('integrity: the candidate token is unchanged', request.token === token);

  /* ------------------------------------------------------------------ */
  /* Request isolation between two candidates                            */
  /* ------------------------------------------------------------------ */
  section('Two active requests: candidate A (OFR-0002) / candidate B (OFR-0003)');

  const createdB = mockBackend.mutateDatabase((db) => {
    const offer = db.offers.find((item) => item.offerId === 'OFR-0003');
    return ensureDocumentRequestForOffer(db, offer, { user: 'probe' });
  });
  const tokenB = createdB.request.token;
  const requestBId = createdB.request.requestId;

  // B's identity document is genuine but HR rejects it.
  await joiningService.verifyDocument('JNG-0002', 'JD-0006', {
    verified: false,
    remarks: 'Identity document is unreadable.',
  });

  database = mockBackend.readDatabase();
  const requestAAfterB = database.documentRequests.find((item) => item.requestId === requestId);
  const seededRequestB = database.documentRequests.find(
    (item) => item.requestId === requestBId
  );
  ok(
    'candidate B rejection sets only B to resubmission_required',
    seededRequestB.status === RESUBMISSION
  );
  ok(
    'candidate A remains submitted while B needs resubmission',
    requestAAfterB.status === SUBMITTED
  );
  ok(
    'each request keeps its own token',
    requestAAfterB.token === token &&
      seededRequestB.token === tokenB &&
      token !== tokenB
  );
  const requestBSnapshot = JSON.parse(JSON.stringify(seededRequestB));
  const docsBSnapshot = JSON.parse(
    JSON.stringify(
      database.joinings.find((item) => item.joiningId === 'JNG-0002').documents
    )
  );

  // A's requested document is now genuinely rejected.
  await joiningService.verifyDocument(joining2.joiningId, 'JD-0001', {
    verified: false,
    remarks: 'Identity document does not match the candidate.',
  });

  database = mockBackend.readDatabase();
  const requestAAfterOwnReject = database.documentRequests.find(
    (item) => item.requestId === requestId
  );
  const requestBAfterA = database.documentRequests.find(
    (item) => item.requestId === requestBId
  );
  ok(
    'candidate A requested identity rejection sets A to resubmission_required',
    requestAAfterOwnReject.status === RESUBMISSION
  );
  ok(
    'candidate A rejection leaves candidate B request untouched',
    deepEqual(requestBAfterA, requestBSnapshot)
  );
  ok(
    'candidate A rejection leaves candidate B documents untouched',
    deepEqual(
      database.joinings.find((item) => item.joiningId === 'JNG-0002').documents,
      docsBSnapshot
    )
  );

  // The unrelated marksheets flag on A never participated in the status.
  const marksheetsA = database.joinings
    .find((item) => item.joiningId === joining2.joiningId)
    .documents.find((doc) => doc.type === 'marksheets' && doc.isCurrent !== false);
  ok(
    'unrelated marksheets remains flagged on the joining record (untouched)',
    marksheetsA?.status === 'resubmission_required'
  );

  /* ------------------------------------------------------------------ */
  /* Data integrity: offers, applications, snapshots                     */
  /* ------------------------------------------------------------------ */
  section('Data integrity');

  const finalDb = mockBackend.readDatabase();
  ok('offers: offer records are unchanged', deepEqual(finalDb.offers, offerSnapshot));
  ok(
    'applications: no application status was changed by request recalculation',
    deepEqual(
      finalDb.applications.map((app) => [app.applicationId, app.status]),
      applicationsSnapshot
    )
  );
  ok(
    'requests: requirement snapshots are unchanged for both requests',
    deepEqual(
      finalDb.documentRequests.find((item) => item.requestId === requestId).requiredDocuments,
      requirementsSnapshot
    ) &&
      deepEqual(
        finalDb.documentRequests.find((item) => item.requestId === requestBId)
          .requiredDocuments,
        createdB.request.requiredDocuments
      )
  );

  const failures = results.filter(([, pass]) => !pass).length;
  console.log(`\n${results.length - failures}/${results.length} probes passed.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error('\nProbe crashed:', error);
  process.exit(1);
});
