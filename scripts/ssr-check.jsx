import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/shared/components/Toast.jsx';
import { TalentAcquisitionProvider } from '../src/modules/talent-acquisition/context/TalentAcquisitionContext.jsx';
import { talentAcquisitionRoutes } from '../src/modules/talent-acquisition/routes/talentAcquisitionRoutes.jsx';
import { ROUTES } from '../src/app/routeConfig.js';

const store = new Map();

global.window = global.window || {};
global.window.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const paths = [
  ROUTES.TALENT_DASHBOARD,
  ROUTES.TALENT_APPLICATIONS,
  `${ROUTES.TALENT_APPLICATIONS}/APP-0001`,
  ROUTES.TALENT_SCREENING,
  ROUTES.TALENT_SHORTLISTING,
  ROUTES.TALENT_INTERVIEWS,
  ROUTES.TALENT_FINAL_SELECTION,
  ROUTES.TALENT_APPROVALS,
  ROUTES.TALENT_OFFERS,
  ROUTES.TALENT_JOINING,
  ROUTES.TALENT_REPORTS,
];

let failures = 0;

for (const path of paths) {
  try {
    const html = renderToString(
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            {talentAcquisitionRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              >
                {route.children?.map((child) => (
                  <Route
                    key={child.path || 'index'}
                    path={child.path || ''}
                    element={child.element}
                  />
                ))}
              </Route>
            ))}
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    const ok = html.length > 500;
    console.log(`${ok ? 'PASS' : 'FAIL'}  render ${path} (${html.length} chars)`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL  render ${path} → ${error.message}`);
    console.log(error.stack.split('\n').slice(0, 6).join('\n'));
  }
}

console.log(`\n${paths.length - failures}/${paths.length} pages rendered`);
if (failures) process.exitCode = 1;
