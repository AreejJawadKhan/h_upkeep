import { NavLink, Outlet } from 'react-router-dom';
import { Button } from './UI';
import { initials } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { BrandWordmark } from './BrandWordmark';

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandWordmark compact subtitle="Your upkeep workspace" />

        <p className="sidebar-copy">
          Track what your home needs next, then move from overview to action without losing context.
        </p>

        <nav className="sidebar-nav">
          <NavLink to="/app/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Overview
          </NavLink>
          <NavLink to="/app/homes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            My Home
          </NavLink>
          <NavLink to="/app/maintenance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Maintenance
          </NavLink>
          <NavLink to="/app/schedules" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Schedules
          </NavLink>
          <div className="sidebar-divider" />
          <NavLink to="/app/spending" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Spending
          </NavLink>
          <NavLink to="/app/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Documents
          </NavLink>
          <NavLink to="/app/warranties" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Warranties
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-chip">
              <div className="avatar">{initials(user.name)}</div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
          ) : null}
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      <section className="app-workspace">
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Keep the home story in one place</h2>
          </div>
          <div className="topbar-pill">Hupkeep workspace</div>
        </header>

        <div className="workspace-body">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
