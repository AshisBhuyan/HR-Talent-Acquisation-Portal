import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <button
        type="button"
        className={`sidebar-scrim ${sidebarOpen ? 'open' : ''}`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <Header onMenuClick={() => setSidebarOpen((current) => !current)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
