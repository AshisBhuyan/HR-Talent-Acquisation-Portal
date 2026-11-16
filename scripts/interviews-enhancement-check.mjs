/**
 * Multi-interviewer scheduling, interviewer notification and validation
 * checks for the interview enhancement. Run with:
 *   node scripts/interviews-enhancement-check.mjs
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
const interviews = (await import(base + 'features/interviews/services/interviewService.js')).default;
const { normalizeInterviewers } = await import(
  base + 'features/interviews/utils/interviewers.js'
);
const { validateInterviewForm } = await import(
  base + 'features/interviews/validation/interviewValidation.js'
);

const results = [];
function pass(name) {
  results.push(['PASS', name]);
}
function fail(name, error) {
  results.push(['FAIL', `${name} -> ${error.message}`]);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function expectError(name, action, matcher) {
  try {
    await action();
    fail(name, new Error('expected an error'));
  } catch (error) {
    assert(matcher.test(error.message), `unexpected message: ${error.message}`);
    pass(name);
  }
}

const dateIn = (days) => {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 10);
};
const at = (days, hour = 11) => {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const db = () => mockBackend.readDatabase();
const findInterview = (id) => db().interviews.find((item) => item.interviewId === id);

/* 1. Legacy records are normalized without rewriting storage. */
const legacy = db().interviews.find((item) => item.interviewId === 'INT-0001');
assert(legacy.interviewers === undefined, 'legacy seed must stay untouched');
const legacyList = normalizeInterviewers(legacy);
assert(legacyList.length === 1, 'legacy interviewer string must normalize to one entry');
assert(legacyList[0].name === 'Rahul Menon', 'legacy interviewer name lost');
assert(legacyList[0].email === '', 'legacy interviewer should have no email');
pass('legacy single-interviewer records normalize at read time');

/* 2. Form validation: interviewers, duplicates, URLs and conditional fields. */
const baseValues = (overrides = {}) => ({
  applicationId: 'APP-0003',
  round: 'managerial',
  interviewers: [
    { name: 'Asha Rao', email: 'asha.rao@example.com' },
    { name: 'Vikram Shah', email: 'vikram.shah@example.com' },
  ],
  scheduledDate: dateIn(3),
  scheduledTime: '11:00',
  mode: 'online',
  meetingLink: 'https://meet.example.com/room',
  location: '',
  notes: '',
  ...overrides,
});

assert(validateInterviewForm(baseValues()).valid, 'valid multi-interviewer form rejected');

const duplicateEmail = validateInterviewForm(
  baseValues({
    interviewers: [
      { name: 'Asha Rao', email: 'Asha.Rao@example.com' },
      { name: 'Vikram Shah', email: ' asha.rao@example.com ' },
    ],
  })
);
assert(!duplicateEmail.valid, 'duplicate emails must be rejected');
assert(
  duplicateEmail.errors['interviewers.1.email'],
  'duplicate email error is missing'
);
pass('duplicate interviewer emails are rejected case-insensitively');

const badLink = validateInterviewForm(
  baseValues({ meetingLink: 'meet.example.com/room' })
);
assert(!badLink.valid && badLink.errors.meetingLink, 'invalid meeting URL accepted');
pass('online mode requires a valid http(s) meeting link');

const offlineMissing = validateInterviewForm(
  baseValues({ mode: 'offline', meetingLink: '', location: '' })
);
assert(!offlineMissing.valid && offlineMissing.errors.location, 'offline venue accepted as empty');
const offlineValid = validateInterviewForm(
  baseValues({
    mode: 'offline',
    meetingLink: 'https://ignored.example.com',
    location: 'Bengaluru · Room 4',
  })
);
assert(offlineValid.valid, 'valid offline form rejected');
pass('offline mode requires a location and ignores the meeting link');

const missingName = validateInterviewForm(
  baseValues({ interviewers: [{ name: '', email: 'panel@example.com' }] })
);
assert(!missingName.valid && missingName.errors['interviewers.0.name'], 'empty name accepted');
pass('every interviewer needs a name');

/* 3. Panel scheduling creates the interviewers, type and notifications. */
const panel = await interviews.scheduleInterview({
  applicationId: 'APP-0003',
  round: 'technical',
  interviewers: [
    { name: 'Asha Rao', email: 'asha.rao@example.com' },
    { name: 'Vikram Shah', email: 'vikram.shah@example.com' },
    { name: 'Meera Iyer', email: 'meera.iyer@example.com' },
    { name: 'Karan Bose', email: 'karan.bose@example.com' },
  ],
  scheduledAt: at(4),
  mode: 'online',
  meetingLink: 'https://meet.example.com/panel',
  notes: 'Panel round',
});
assert(panel.interviewers.length === 4, 'interviewer list not stored');
assert(panel.interviewerCount === 4, 'interviewer count missing');
assert(panel.interviewType === 'panel', `expected panel, got ${panel.interviewType}`);
assert(
  panel.interviewer.includes('Asha Rao') && panel.interviewer.includes('Karan Bose'),
  'legacy interviewer string not kept in sync'
);
assert(
  panel.interviewers.every((item) => item.notificationStatus === 'sent'),
  'pending interviewer notifications were not sent'
);
pass('four interviewers create a panel interview and are notified automatically');

const interviewerEvents = db().emailEvents.filter(
  (event) => event.type === 'interviewer_notification'
);
assert(
  interviewerEvents.filter((event) => event.applicationId === 'APP-0003').length >= 4,
  'interviewer notification log entries missing'
);
pass('interviewer notifications are recorded in the mock email log');

/* 4. Duplicate round guard. */
await expectError(
  'duplicate interview rounds are blocked',
  () =>
    interviews.scheduleInterview({
      applicationId: 'APP-0003',
      round: 'technical',
      interviewers: [{ name: 'Asha Rao', email: 'asha.rao@example.com' }],
      scheduledAt: at(6),
      mode: 'online',
      meetingLink: 'https://meet.example.com/duplicate',
    }),
  /already scheduled/i
);

await expectError(
  'at least one interviewer is required',
  () =>
    interviews.scheduleInterview({
      applicationId: 'APP-0015',
      round: 'managerial',
      interviewers: [],
      scheduledAt: at(6),
      mode: 'online',
      meetingLink: 'https://meet.example.com/no-interviewer',
    }),
  /at least one interviewer/i
);

await expectError(
  'duplicate interviewer emails are blocked by the service',
  () =>
    interviews.scheduleInterview({
      applicationId: 'APP-0015',
      round: 'managerial',
      interviewers: [
        { name: 'One', email: 'same@example.com' },
        { name: 'Two', email: 'SAME@example.com' },
      ],
      scheduledAt: at(6),
      mode: 'online',
      meetingLink: 'https://meet.example.com/duplicate-email',
    }),
  /unique email/i
);

/* 5. Invalid email fails without rolling back the schedule; retry works after fixing it. */
const invalid = await interviews.scheduleInterview({
  applicationId: 'APP-0015',
  round: 'managerial',
  interviewers: [
    { name: 'Broken Mail', email: 'not-an-email' },
    { name: 'Valid Mail', email: 'valid.mail@example.com' },
  ],
  scheduledAt: at(6),
  mode: 'offline',
  location: 'Hyderabad · Room 1',
  meetingLink: 'https://ignored.example.com',
});
assert(invalid.interviewers[0].notificationStatus === 'failed', 'invalid email should fail');
assert(invalid.interviewers[1].notificationStatus === 'sent', 'valid email should be sent');
assert(invalid.meetingLink === '', 'offline scheduling must clear the meeting link');
assert(invalid.location === 'Hyderabad · Room 1', 'offline location missing');
pass('invalid interviewer email fails without rolling back the schedule');

const retried = await interviews.retryInterviewerNotifications(
  invalid.interviewId,
  invalid.interviewers[0].id
);
assert(retried.failed === 1, 'retry of an invalid email should fail again');
assert(
  findInterview(invalid.interviewId).interviewers[0].notificationStatus === 'failed',
  'failed status not persisted after retry'
);
pass('invalid email can be retried and stays failed until corrected');

await interviews.updateInterview(invalid.interviewId, {
  round: 'managerial',
  interviewers: [
    {
      id: invalid.interviewers[0].id,
      name: 'Broken Mail',
      email: 'fixed.mail@example.com',
    },
    {
      id: invalid.interviewers[1].id,
      name: 'Valid Mail',
      email: 'valid.mail@example.com',
    },
  ],
  scheduledAt: at(7),
  mode: 'offline',
  location: 'Hyderabad · Room 1',
  notes: 'Email corrected',
});
const corrected = findInterview(invalid.interviewId);
assert(
  corrected.interviewers[0].notificationStatus === 'sent',
  'corrected email should be notified automatically'
);
assert(
  corrected.interviewers[1].notificationStatus === 'sent',
  'already-sent interviewer must stay sent'
);
pass('editing a failed interviewer email re-notifies only the new recipient');

await expectError(
  'retry does not resend an already-sent notification',
  () =>
    interviews.retryInterviewerNotifications(
      invalid.interviewId,
      invalid.interviewers[1].id
    ),
  /no interviewer notifications waiting/i
);

/* 6. Already-sent statuses survive a reschedule and no duplicate send happens. */
const beforeEvents = db().emailEvents.filter(
  (event) =>
    event.type === 'interviewer_notification' &&
    event.applicationId === 'APP-0015'
).length;
await interviews.rescheduleInterview(invalid.interviewId, {
  round: 'managerial',
  interviewers: [
    {
      id: corrected.interviewers[0].id,
      name: 'Broken Mail',
      email: 'fixed.mail@example.com',
    },
    {
      id: corrected.interviewers[1].id,
      name: 'Valid Mail',
      email: 'valid.mail@example.com',
    },
  ],
  scheduledAt: at(8),
  mode: 'online',
  meetingLink: 'https://meet.example.com/rescheduled',
  location: 'Stale venue should be cleared',
});
const rescheduled = findInterview(invalid.interviewId);
assert(rescheduled.status === 'rescheduled', 'reschedule status missing');
assert(rescheduled.location === '', 'online reschedule must clear the location');
assert(
  rescheduled.interviewers.every((item) => item.notificationStatus === 'sent'),
  'reschedule must not reset sent notification statuses'
);
const afterEvents = db().emailEvents.filter(
  (event) =>
    event.type === 'interviewer_notification' &&
    event.applicationId === 'APP-0015'
).length;
assert(
  afterEvents === beforeEvents,
  `reschedule must not resend interviewer notifications (${beforeEvents} -> ${afterEvents})`
);
pass('rescheduling updates the mode without resending sent notifications');

/* 7. Candidate invitation still works and now lists every interviewer. */
const invitation = await interviews.sendInterviewInvitation(panel.interviewId);
assert(invitation.mode === 'mock' && invitation.delivered === false, 'invitation should be simulated');
assert(
  invitation.body.includes('Asha Rao') && invitation.body.includes('Karan Bose'),
  'candidate invitation does not list all interviewers'
);
pass('candidate invitation remains manual and lists every interviewer');

await expectError(
  'candidate invitation cannot be sent twice',
  () => interviews.sendInterviewInvitation(panel.interviewId),
  /already been sent/i
);

results.forEach(([status, name]) => console.log(`${status}  ${name}`));
const failures = results.filter(([status]) => status === 'FAIL');
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length) process.exitCode = 1;
