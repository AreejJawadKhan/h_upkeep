import { NavLink, Outlet } from 'react-router-dom';
import { Button } from './UI';
import { initials } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { type CurrencyCode, usePreferences } from '../context/PreferencesContext';
import { BrandWordmark } from './BrandWordmark';

export function AppShell() {
  const { user, logout } = useAuth();
  const { currencyCode, currencyOptions, setCurrencyCode } = usePreferences();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandWordmark compact />

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
          <label className="sidebar-preference">
            <span className="field-label">Currency</span>
            <select className="input" value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value as CurrencyCode)}>
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

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
          <div className="topbar-pill">Hupkeep</div>
        </header>

        <div className="workspace-body">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
