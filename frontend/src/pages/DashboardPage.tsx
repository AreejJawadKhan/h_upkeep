import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Panel } from '../components/UI';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import { parseHomeParam } from '../lib/routes';
import type { DashboardOverviewResponse, Home } from '../lib/types';

function pctWidth(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
}

export function DashboardPage() {
  const { accessToken, refreshSession } = useAuth();
  const { currencyCode } = usePreferences();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loadingHomes, setLoadingHomes] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState('');

  const selectedHomeId = parseHomeParam(params.get('home'));
  const selectedHome = useMemo(
    () => homes.find((home) => String(home.id) === selectedHomeId) ?? null,
    [homes, selectedHomeId],
  );
  const attentionCount =
    (overview?.overdue_count ?? 0) +
    (overview?.due_soon_count ?? 0) +
    (overview?.expiring_soon_count ?? 0) +
    (overview?.expired_warranty_count ?? 0);
  const healthScore = overview ? Math.max(40, 100 - attentionCount * 15) : 0;
  const healthLabel =
    attentionCount === 0 ? 'On track' : attentionCount <= 2 ? 'A few items need review' : 'Needs attention';
  const topUpcoming = overview?.upcoming_maintenance.slice(0, 3) ?? [];
  const topActivity = overview?.recent_activity.slice(0, 3) ?? [];
  const homeCards = overview?.home_health ?? [];
  const scopeLabel = selectedHome ? selectedHome.name : 'All homes';

  async function loadHomes() {
    setLoadingHomes(true);
    try {
      const data = await apiRequestWithRefresh<Home[]>(
        '/homes',
        {},
        () => accessToken,
        refreshSession,
      );
      setHomes(data);

      if (selectedHomeId && !data.some((home) => String(home.id) === selectedHomeId)) {
        setParams({}, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load homes.');
    } finally {
      setLoadingHomes(false);
    }
  }

  async function loadOverview() {
    setLoadingOverview(true);
    setError('');
    try {
      const data = await apiRequestWithRefresh<DashboardOverviewResponse>(
        selectedHome ? `/dashboard?home_id=${selectedHome.id}` : '/dashboard',
        {},
        () => accessToken,
        refreshSession,
      );
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard.');
    } finally {
      setLoadingOverview(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    void loadHomes();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || loadingHomes) return;
    void loadOverview();
  }, [accessToken, loadingHomes, selectedHome?.id]);

  const trendMax = Math.max(...(overview?.spending.monthly_trend.map((entry) => entry.total_spend) ?? [0]), 0);

  return (
    <div className="workspace-page dashboard-page">
      <PageHeader
        title="Overview"
        description="Here&apos;s what needs attention across your homes."
        actions={
          <label className="toolbar-field dashboard-scope">
            <span className="detail-label">Scope</span>
            <select
              className="input"
              value={selectedHomeId}
              onChange={(event) => {
                const value = event.target.value;
                setParams(value ? { home: value } : {}, { replace: true });
              }}
            >
              <option value="">All homes</option>
              {homes.map((home) => (
                <option key={home.id} value={home.id}>
                  {home.name}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {error ? (
        <div className="form-error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      {loadingOverview ? (
        <Panel title="Overview">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading overview...</p>
          </div>
        </Panel>
      ) : overview ? (
        <>
          <div className="dashboard-snapshot-grid">
            <article className="dashboard-feature-card dashboard-feature-dark">
              <div className="eyebrow">Needs attention</div>
              <h3>{attentionCount}</h3>
              <p>{attentionCount === 1 ? 'Item is overdue or due soon.' : 'Items are overdue or due soon.'}</p>
              <div className="dashboard-feature-actions">
                <Button variant="primary" href="/app/maintenance">
                  Review maintenance
                </Button>
                <span className="meta-pill">{scopeLabel}</span>
              </div>
            </article>

            <article className="dashboard-feature-card dashboard-status-card">
              <div className="eyebrow">Home status</div>
              <div className="dashboard-gauge" style={{ background: `conic-gradient(var(--accent-3) 0 ${healthScore}%, var(--surface-strong) ${healthScore}% 100%)` }}>
                <div className="dashboard-gauge-inner">
                  <strong>{healthScore}%</strong>
                </div>
              </div>
              <strong>{healthLabel}</strong>
              <p>{overview.home_count} homes · {overview.warranty_count} warranties</p>
            </article>

            <article className="dashboard-feature-card dashboard-list-card">
              <div className="eyebrow">Upcoming</div>
              {topUpcoming.length === 0 ? (
                <p className="muted-copy">Nothing coming up in the next 30 days.</p>
              ) : (
                <div className="dashboard-mini-list">
                  {topUpcoming.map((item) => (
                    <div className="dashboard-mini-row" key={`${item.kind}-${item.source_id}`}>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.home_name}</span>
                      </div>
                      <span className={`schedule-tag ${item.status === 'overdue' ? 'overdue' : item.status === 'due_soon' ? 'soon' : 'active'}`}>
                        {formatDate(item.due_date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" href="/app/schedules" className="dashboard-link-button">
                View schedule
              </Button>
            </article>

            <article className="dashboard-feature-card dashboard-list-card">
              <div className="eyebrow">Recent activity</div>
              {topActivity.length === 0 ? (
                <p className="muted-copy">Activity will appear as you work in the app.</p>
              ) : (
                <div className="dashboard-mini-list">
                  {topActivity.map((item) => (
                    <div className="dashboard-mini-row" key={`${item.kind}-${item.source_id}`}>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.home_name}</span>
                      </div>
                      <span className="meta-pill">{formatDateTime(item.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" href="/app/documents" className="dashboard-link-button">
                View all activity
              </Button>
            </article>
          </div>

          <Panel title="Your homes">
            {homeCards.length === 0 ? (
              <EmptyState
                title="No home health yet"
                description="Create homes, assets, and schedules to make this section come alive."
              />
            ) : (
              <div className="dashboard-home-grid">
                {homeCards.map((home) => (
                  <article key={home.home_id} className="dashboard-home-card">
                    <div className="dashboard-home-head">
                      <strong>{home.home_name}</strong>
                      <span className={`warranty-tag ${home.status_label === 'Attention' ? 'overdue' : home.status_label === 'Watch' ? 'soon' : 'active'}`}>
                        {home.status_label}
                      </span>
                    </div>
                    <p>{home.summary}</p>
                    <div className="dashboard-home-metrics">
                      <div>
                        <span className="detail-label">Assets</span>
                        <strong>{home.asset_count}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Records</span>
                        <strong>{home.maintenance_record_count}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Schedules</span>
                        <strong>{home.schedule_count}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Warranties</span>
                        <strong>{home.warranty_count}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <div className="split-panels">
            <Panel title="Spending">
              <div className="dashboard-spending">
                <div className="dashboard-spending-summary">
                  <div className="hero-metric">
                    <span>Total spend</span>
                    <strong>{formatCurrency(overview.spending.total_spend, currencyCode)}</strong>
                  </div>
                  <div className="hero-metric">
                    <span>Average record</span>
                    <strong>{formatCurrency(overview.spending.average_cost, currencyCode)}</strong>
                  </div>
                  <div className="hero-metric">
                    <span>Records</span>
                    <strong>{overview.spending.record_count}</strong>
                  </div>
                </div>

                <div className="dashboard-trend-panel">
                  <h3>Monthly trend</h3>
                  <div className="dashboard-trend-list dashboard-trend-scroll">
                    {overview.spending.monthly_trend.map((entry) => (
                      <div className="trend-row" key={entry.label}>
                        <div className="trend-labels">
                          <strong>{entry.label}</strong>
                          <span>{entry.record_count} records</span>
                        </div>
                        <div className="trend-track">
                          <div className="trend-fill" style={{ width: `${pctWidth(entry.total_spend, trendMax)}%` }} />
                        </div>
                        <strong className="trend-value">{formatCurrency(entry.total_spend, currencyCode)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Warranties">
              {overview.warranty_alerts.length === 0 ? (
                <EmptyState
                  title="No warranty alerts"
                  description="Expiring coverage will appear here as expiration dates approach."
                />
              ) : (
                <div className="item-list dashboard-alert-list">
                  {overview.warranty_alerts.map((item) => (
                    <article className="item-card dashboard-alert-card" key={`${item.source_id}-${item.status}`}>
                      <div>
                        <strong>{item.provider}</strong>
                        <p>{item.asset_name}</p>
                        <p className="muted-copy">
                          {item.home_name} · Expires {formatDate(item.expiration_date)}
                        </p>
                      </div>
                      <div className="item-actions">
                        <span className={`warranty-tag ${item.status === 'expired' ? 'overdue' : 'soon'}`}>
                          {item.status === 'expired' ? 'Expired' : 'Expiring soon'}
                        </span>
                        {item.document_id ? <span className="warranty-tag muted">Document linked</span> : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      ) : (
        <EmptyState
          title="No dashboard data yet"
          description="Add homes, maintenance, schedules, documents, and warranties to populate the dashboard."
        />
      )}
    </div>
  );
}
