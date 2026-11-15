/**
 * Workflow smoke test of the approval → offer → acceptance → document-request
 * chain and the seeded JNG-0002 handover guards. Run with:
 *   node scripts/smoke-workflow2.cjs
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
  const approvalService = (await import(fileUrl('src/modules/talent-acquisition/features/approvals/services/approvalService.js'))).default;
  const offerService = (await import(fileUrl('src/modules/talent-acquisition/features/offers/services/offerService.js'))).default;
  const joiningService = (await import(fileUrl('src/modules/talent-acquisition/features/joining-onboarding/services/joiningService.js'))).default;
  const reportsService = (await import(fileUrl('src/modules/talent-acquisition/features/reports-analytics/services/reportsService.js'))).default;

  // Fresh seed sanity
  const db = mockBackend.readDatabase();
  const reportsSeed = await reportsService.getReports({});
  ok('seeded JNG-0002 counts as handed over', reportsSeed.joiningStats.handedOver === 1);

  // Duplicate import of the already-imported JNG-0002 must fail
  let importThrew = false;
  try {
    await joiningService.importEmployeeToDatabank('JNG-0002');
  } catch {
    importThrew = true;
  }
  ok('already-imported handover cannot be imported twice', importThrew);

  // Approval flow for APR-0001 (pending)
  const decided = await approvalService.decideApproval('APR-0001', { status: 'approved', remarks: 'Approved for hire.' });
  ok('admin approval is recorded', decided.status === 'approved');

  // Offer creation allowed only after approval
  const offer = await offerService.createOffer({
    applicationId: 'APP-0017',
    designation: 'Associate Partner',
    department: 'Finance',
    employmentType: 'Full-time',
    salaryPackage: 2200000,
    joiningDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  });
  ok('offer draft is created for an approved candidate', offer.status === 'draft');

  // Duplicate offer blocked
  let dupThrew = false;
  try {
    await offerService.createOffer({ applicationId: 'APP-0017', salaryPackage: 1, joiningDate: '2030-01-01', expiryDate: '2029-01-01', designation: 'X', department: 'Y' });
  } catch {
    dupThrew = true;
  }
  ok('duplicate offer for the same application is blocked', dupThrew);

  // Send the offer → simulated email recorded once, token minted
  const sent = await offerService.sendOffer(offer.offerId);
  ok('sent offer carries a response token', Boolean(sent.responseToken));
  const db2 = mockBackend.readDatabase();
  const offerEmails = db2.emailEvents.filter((e) => e.type === 'offer_letter' && e.offerId === offer.offerId);
  ok('exactly one simulated offer email recorded', offerEmails.length === 1);
  ok('offer email includes candidate-specific response link', offerEmails[0].link.endsWith(sent.responseToken));
  ok('offer email is simulated, not delivered', offerEmails[0].simulated === true && offerEmails[0].delivered === false);

  // Admin rejected candidate cannot receive an offer
  const decided2 = await approvalService.decideApproval('APR-0002', { status: 'rejected', remarks: 'Not aligned with headcount.' });
  ok('admin rejection recorded', decided2.status === 'rejected');
  let rejectedOfferThrew = false;
  try {
    await offerService.createOffer({ applicationId: 'APP-0016', salaryPackage: 1000000, joiningDate: '2030-02-01', designation: 'Dev', department: 'Engineering' });
  } catch {
    rejectedOfferThrew = true;
  }
  ok('offer creation is blocked after admin rejection', rejectedOfferThrew);

  // Candidate declines via service (portal path uses the same call)
  const sent2 = await offerService.sendOffer(offer.offerId).catch(() => null); // already sent → should throw
  ok('re-sending an already-sent offer is rejected', sent2 === null);

  const declined = await offerService.recordOfferResponse(offer.offerId, { response: 'declined' });
  ok('candidate decline is recorded', declined.status === 'declined');
  const db3 = mockBackend.readDatabase();
  ok('decline does not create a document request', !db3.documentRequests.some((r) => r.offerId === offer.offerId));
  ok('decline does not create a joining record', !db3.joinings.some((j) => j.offerId === offer.offerId));

  // Timeline events were generated for the workflow
  const db4 = mockBackend.readDatabase();
  const app17 = db4.applications.find((a) => a.applicationId === 'APP-0017');
  ok('application timeline has the approval/offer events',
    (app17.timeline || []).some((t) => /offer/i.test(t.event || '') || /offer/i.test(t.note || '')));

  const failed = results.filter(([, passed]) => !passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
