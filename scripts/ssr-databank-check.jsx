import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/shared/components/Toast.jsx';
import { employeeDatabankRoutes } from '../src/modules/employee-databank/routes/employeeDatabankRoutes.jsx';

const store = new Map();

global.window = global.window || {};
global.window.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const paths = [
  '/hr/employee-databank/current',
  '/hr/employee-databank/all',
  '/hr/employee-databank/former',
  '/hr/employee-databank/invitations',
  '/hr/employee-databank/submissions',
];

let failures = 0;

for (const path of paths) {
  try {
    const html = renderToString(
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            {employeeDatabankRoutes.map((route) => (
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

    const ok = html.length > 200;
    console.log(`${ok ? 'PASS' : 'FAIL'}  databank render ${path} (${html.length} chars)`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL  databank render ${path} → ${error.message}`);
  }
}

console.log(`\n${paths.length - failures}/${paths.length} databank pages rendered`);
if (failures) process.exitCode = 1;
