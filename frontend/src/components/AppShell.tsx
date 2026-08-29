import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button } from './UI';
import { initials } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { type CurrencyCode, usePreferences } from '../context/PreferencesContext';
import { BrandWordmark } from './BrandWordmark';

export function AppShell() {
  const { user, logout } = useAuth();
  const { currencyCode, currencyOptions, setCurrencyCode } = usePreferences();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { label: 'Overview', to: '/app/dashboard' },
      { label: 'My Home', to: '/app/homes' },
      { label: 'Maintenance', to: '/app/maintenance' },
      { label: 'Schedules', to: '/app/schedules' },
      { label: 'Spending', to: '/app/spending' },
      { label: 'Documents', to: '/app/documents' },
      { label: 'Warranties', to: '/app/warranties' },
    ],
    [],
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandWordmark compact />

        <nav className="sidebar-nav">
          {navItems.slice(0, 4).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
          <div className="sidebar-divider" />
          {navItems.slice(4).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
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
          <div className="workspace-topbar-start">
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav-drawer"
              >
                <span aria-hidden="true">☰</span>
                <span>Menu</span>
              </button>
          </div>
        </header>

        <div className="workspace-body">
          <Outlet />
        </div>
      </section>

      {mobileNavOpen ? (
        <div className="drawer-backdrop mobile-nav-backdrop" role="presentation" onClick={() => setMobileNavOpen(false)}>
          <aside
            id="mobile-nav-drawer"
            className="drawer-panel mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-head mobile-nav-head">
              <BrandWordmark compact />
              <button
                type="button"
                className="drawer-close"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
              >
                ×
              </button>
            </div>

            <nav className="mobile-nav-menu" aria-label="Primary">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="mobile-nav-section">
              <label className="sidebar-preference">
                <span className="field-label">Currency</span>
                <select
                  className="input"
                  value={currencyCode}
                  onChange={(event) => setCurrencyCode(event.target.value as CurrencyCode)}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {user ? (
              <div className="user-chip mobile-user-chip">
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
          </aside>
        </div>
      ) : null}
    </div>
  );
}
