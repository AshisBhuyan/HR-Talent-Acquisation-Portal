/**
 * Smoke test of the full recruitment workflow against the mock backend.
 * Run with: node scripts/smoke-assessment.cjs (from project root)
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

(async () => {
  const mockBackend = await import(fileUrl('src/modules/talent-acquisition/services/mockBackend.js'));
  const offerService = (await import(fileUrl('src/modules/talent-acquisition/features/offers/services/offerService.js'))).default;
  const documentRequestService = (await import(fileUrl('src/modules/talent-acquisition/features/document-requests/services/documentRequestService.js'))).default;
  const joiningService = (await import(fileUrl('src/modules/talent-acquisition/features/joining-onboarding/services/joiningService.js'))).default;
  const approvalService = (await import(fileUrl('src/modules/talent-acquisition/features/approvals/services/approvalService.js'))).default;
  const reportsService = (await import(fileUrl('src/modules/talent-acquisition/features/reports-analytics/services/reportsService.js'))).default;

  // Seed sanity
  const db = mockBackend.readDatabase();
  ok('seed has version 6', db.version === 6);
  ok('seed exposes emailEvents and documentRequests', Array.isArray(db.emailEvents) && Array.isArray(db.documentRequests));

  // Migration is additive: write an older-shaped record and re-read from a fresh module instance is not possible in-process,
  // but ensureCollections on the current store covers the new collections.
  ok('seeded sent offer keeps a response token after migration', (() => {
    const offer = db.offers.find((item) => item.offerId === 'OFR-0001');
    return Boolean(offer?.responseToken);
  })());

  // --- Offer acceptance flow (OFR-0001 is seeded as sent) ---
  const first = await offerService.recordOfferResponse('OFR-0001', { response: 'accepted' });
  ok('offer acceptance records the response', first.status === 'accepted');
  ok('acceptance auto-creates a document request', Boolean(first.documentRequest));
  ok('document request carries a token and requested status',
    first.documentRequest?.token && first.documentRequest?.status === 'requested');

  const db2 = mockBackend.readDatabase();
  const request = db2.documentRequests.find((item) => item.offerId === 'OFR-0001');
  ok('document request was persisted', Boolean(request));
  const offerLetters = db2.emailEvents.filter((e) => e.type === 'offer_letter');
  const docEmails = db2.emailEvents.filter((e) => e.type === 'document_request');
  ok('exactly one document-request email was recorded', docEmails.length === 1);
  ok('document-request email is labelled simulated and undelivered',
    docEmails[0].simulated === true && docEmails[0].delivered === false);
  ok('document-request email contains the portal link', docEmails[0].link.includes('/candidate/document-submission/'));

  // Duplicate acceptance must fail
  let threw = false;
  try {
    await offerService.recordOfferResponse('OFR-0001', { response: 'accepted' });
  } catch {
    threw = true;
  }
  ok('duplicate acceptance is rejected', threw);
  const db3 = mockBackend.readDatabase();
  ok('duplicate acceptance does not create a second email', db3.emailEvents.filter((e) => e.type === 'document_request').length === 1);

  // --- Candidate portal flow ---
  const portal = await documentRequestService.getPortalState(request.token);
  ok('portal resolves the token', Boolean(portal?.candidate?.fullName));
  ok('portal lists six required documents', portal.states.length === 6);
  ok('portal shows mandatory identity requirement', portal.states.find((s) => s.type === 'identity')?.mandatory === true);

  // Stage a file (metadata only; blob storage is exercised in the browser)
  await documentRequestService.stageDocument(request.token, {
    type: 'identity',
    fileName: 'Identity_Smoke.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    storageKey: 'smoke:identity',
  });
  await documentRequestService.stageDocument(request.token, {
    type: 'address',
    fileName: 'Address_Smoke.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    storageKey: 'smoke:address',
  });

  const submitResult = await documentRequestService.submitDocuments(request.token, { user: 'Candidate' });
  ok('portal submission creates/links a joining record', Boolean(submitResult.joiningId));

  const db4 = mockBackend.readDatabase();
  const joining = db4.joinings.find((item) => item.joiningId === submitResult.joiningId);
  ok('two joining documents were recorded', joining.documents.length === 2);
  ok('joining documents carry versions', joining.documents.every((d) => d.version === 1));
  ok('checklist items for identity/address moved to submitted',
    ['identity', 'address'].every((key) => joining.checklist.find((c) => c.key === key)?.status === 'submitted'));
  ok('application moved to joining stage', db4.applications.find((a) => a.applicationId === joining.applicationId)?.status === 'joining');

  // --- HR verification flow ---
  const verify = await joiningService.verifyDocument(joining.joiningId, joining.documents[0].documentId, { verified: true, remarks: 'Smoke verified.' });
  ok('HR can verify a submitted document', verify.status === 'verified');

  // Rejection sends a simulated resubmission email
  await joiningService.verifyDocument(joining.joiningId, joining.documents[1].documentId, { verified: false, remarks: 'Unreadable scan.' });
  const db5 = mockBackend.readDatabase();
  const resub = db5.emailEvents.filter((e) => e.type === 'resubmission');
  ok('rejection records a simulated resubmission email', resub.length === 1);
  ok('resubmission email carries the portal link', resub[0].link.includes('/candidate/document-submission/'));
  const joiningAfterReject = db5.joinings.find((item) => item.joiningId === joining.joiningId);
  ok('address document now requires resubmission',
    joiningAfterReject.documents.find((d) => d.type === 'address')?.status === 'resubmission_required');

  // Candidate resubmits a replacement with the same type -> new version, old preserved
  await documentRequestService.stageDocument(request.token, {
    type: 'address',
    fileName: 'Address_Smoke_v2.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2222,
    storageKey: 'smoke:address:v2',
  });
  await documentRequestService.submitDocuments(request.token, { user: 'Candidate' });
  const db6 = mockBackend.readDatabase();
  const joiningResub = db6.joinings.find((item) => item.joiningId === joining.joiningId);
  const addressDocs = joiningResub.documents.filter((d) => d.type === 'address');
  ok('resubmission created a second version and kept the old one',
    addressDocs.length === 2 &&
      addressDocs.filter((d) => d.isCurrent !== false).length === 1 &&
      addressDocs.find((d) => d.isCurrent !== false).version === 2);

  // --- markJoined gate ---
  let joinedThrew = false;
  try {
    await joiningService.markJoined(joining.joiningId);
  } catch (error) {
    joinedThrew = Boolean(error.message);
  }
  ok('markJoined is blocked until all requirements are verified', joinedThrew);

  // --- Reports ---
  const reports = await reportsService.getReports({});
  ok('reports expose joining handed-over count from joining.handover', typeof reports.joiningStats.handedOver === 'number');
  ok('reports expose document submission stats', typeof reports.documentSubmissionStats.submissionRate === 'number');
  ok('reports expose document verification stats', typeof reports.documentVerificationStats.verificationRate === 'number');
  ok('reports expose email activity stats', typeof reports.emailActivity.total === 'number');

  const failed = results.filter(([, passed]) => !passed);
  console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed.`);
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
