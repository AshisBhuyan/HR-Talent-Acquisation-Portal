import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/shared/components/Toast.jsx';
import {
  TalentAcquisitionContext,
} from '../src/modules/talent-acquisition/context/TalentAcquisitionContext.jsx';
import CandidateProfilePage from '../src/modules/talent-acquisition/pages/CandidateProfilePage.jsx';
import { readDatabase } from '../src/modules/talent-acquisition/services/mockBackend.js';
import { ROUTES } from '../src/app/routeConfig.js';

const store = new Map();

global.window = global.window || {};
global.window.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const database = readDatabase();

const value = {
  ...database,
  loading: false,
  error: '',
  stats: {
    totalApplications: database.applications.length,
    newApplications: 0,
    underScreening: 0,
    shortlisted: 0,
    upcomingInterviews: 0,
    selected: 0,
    pendingApprovals: 0,
    offersSent: 0,
  },
  actions: {},
  refresh: () => {},
};

const paths = [
  `${ROUTES.TALENT_APPLICATIONS}/APP-0001`,
  `${ROUTES.TALENT_APPLICATIONS}/APP-0007`,
];

let failures = 0;

for (const path of paths) {
  try {
    const html = renderToString(
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <TalentAcquisitionContext.Provider value={value}>
            <Routes>
              <Route path={ROUTES.TALENT_APPLICATION_PATTERN} element={<CandidateProfilePage />} />
            </Routes>
          </TalentAcquisitionContext.Provider>
        </MemoryRouter>
      </ToastProvider>
    );

    const ok = html.length > 2000 && html.includes('Personal information');
    console.log(`${ok ? 'PASS' : 'FAIL'}  render profile ${path} (${html.length} chars)`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL  render profile ${path} → ${error.message}`);
  }
}

console.log(`\n${paths.length - failures}/${paths.length} profile pages rendered`);
if (failures) process.exitCode = 1;
