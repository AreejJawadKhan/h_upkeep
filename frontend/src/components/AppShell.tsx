import { NavLink, Outlet } from 'react-router-dom';
import { Button } from './UI';
import { initials } from '../lib/format';
import { useAuth } from '../context/AuthContext';

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">HR</div>
          <div>
            <p className="eyebrow">HomeRepair Log</p>
            <h1>Field Journal</h1>
          </div>
        </div>

        <p className="sidebar-copy">
          A deliberate workspace for tracking the things that keep a house healthy.
        </p>

        <nav className="sidebar-nav">
          <NavLink to="/app/homes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Homes
          </NavLink>
          <NavLink to="/app/schedules" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Schedules
          </NavLink>
          <NavLink to="/app/spending" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Spending
          </NavLink>
          <NavLink to="/app/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Documents
          </NavLink>
          <NavLink to="/app/warranties" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Warranties
          </NavLink>
          <NavLink to="/app/maintenance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Maintenance
          </NavLink>
          <span className="nav-link nav-link-muted" aria-disabled="true">
            Dashboard <span>soon</span>
          </span>
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
            <p className="eyebrow">Workspace</p>
            <h2>Keep the home story in one place</h2>
          </div>
          <div className="topbar-pill">Protected session active</div>
        </header>

        <div className="workspace-body">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
