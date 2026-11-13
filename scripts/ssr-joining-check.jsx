import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../src/shared/components/Toast.jsx';
import { TalentAcquisitionProvider } from '../src/modules/talent-acquisition/context/TalentAcquisitionContext.jsx';
import JoiningOnboardingPage from '../src/modules/talent-acquisition/pages/JoiningOnboardingPage.jsx';

const store = new Map();

global.window = global.window || {};
global.window.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
global.URL.createObjectURL = () => 'blob:mock';
global.URL.revokeObjectURL = () => {};

// Wait for the provider's useEffect-ish load (it is synchronous with our storage stub).
const html = renderToString(
  <ToastProvider>
    <MemoryRouter initialEntries={['/hr/talent-acquisition/joining']}>
      <TalentAcquisitionProvider>
        <JoiningOnboardingPage />
      </TalentAcquisitionProvider>
    </MemoryRouter>
  </ToastProvider>
);

console.log(`rendered joining page (${html.length} chars)`);
console.log(html.includes('Joining') ? 'PASS joining page renders' : 'FAIL joining page did not render');
