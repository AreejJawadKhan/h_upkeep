import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Panel } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { DashboardOverviewResponse, Home } from '../lib/types';

function pctWidth(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
}

export function DashboardPage() {
  const { accessToken, refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loadingHomes, setLoadingHomes] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState('');

  const selectedHomeId = params.get('home') ?? '';
  const selectedHome = useMemo(
    () => homes.find((home) => String(home.id) === selectedHomeId) ?? null,
    [homes, selectedHomeId],
  );

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
  const categoryMax = Math.max(...(overview?.spending.category_breakdown.map((entry) => entry.total_spend) ?? [0]), 0);

  const cards = [
    { label: 'Homes', value: overview?.home_count ?? 0, note: 'Active places' },
    { label: 'Assets', value: overview?.asset_count ?? 0, note: 'Tracked systems' },
    { label: 'Due soon', value: overview?.due_soon_count ?? 0, note: 'Next 30 days' },
    { label: 'Overdue', value: overview?.overdue_count ?? 0, note: 'Needs action' },
    { label: 'Warranty alerts', value: (overview?.expiring_soon_count ?? 0) + (overview?.expired_warranty_count ?? 0), note: 'Watch list' },
    { label: 'Total spend', value: formatCurrency(overview?.total_spend ?? 0), note: 'All time' },
  ];

  return (
    <div className="homes-page dashboard-page">
      <div className="overview-row dashboard-overview">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </div>
        ))}
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <Panel title="Scope" eyebrow="Dashboard">
            <div className="scope-stack">
              <Button
                variant={!selectedHome ? 'primary' : 'secondary'}
                onClick={() => setParams({}, { replace: true })}
              >
                All homes
              </Button>
              <p className="muted-copy">
                {selectedHome
                  ? `Showing the command center for ${selectedHome.name}.`
                  : 'Showing the full household view across every home.'}
              </p>
            </div>

            {loadingHomes ? (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading homes...</p>
              </div>
            ) : homes.length === 0 ? (
              <EmptyState
                title="No homes yet"
                description="Create a home first so the dashboard has something to summarize."
              />
            ) : (
              <div className="home-list">
                {homes.map((home) => {
                  const active = String(home.id) === selectedHome?.id?.toString();
                  return (
                    <article key={home.id} className={`home-card ${active ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="home-card-body"
                        onClick={() => setParams({ home: String(home.id) })}
                      >
                        <strong>{home.name}</strong>
                        <span>
                          {home.property_type} · {home.year_built}
                        </span>
                        <em>{home.address}</em>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Focus" eyebrow="This window">
            {overview ? (
              <div className="home-detail dashboard-focus">
                <div>
                  <p className="detail-label">Scope</p>
                  <strong>{overview.scope_home_name ?? 'All homes'}</strong>
                </div>
                <div>
                  <p className="detail-label">Average spend</p>
                  <strong>{formatCurrency(overview.average_cost)}</strong>
                </div>
                <div>
                  <p className="detail-label">Records</p>
                  <strong>{overview.maintenance_record_count}</strong>
                </div>
                <div>
                  <p className="detail-label">Upcoming items</p>
                  <strong>{overview.upcoming_maintenance.length}</strong>
                </div>
              </div>
            ) : (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading snapshot...</p>
              </div>
            )}
          </Panel>
        </aside>

        <section className="workspace-main">
          {loadingOverview ? (
            <Panel title="Dashboard" eyebrow="Phase 10">
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading dashboard...</p>
              </div>
            </Panel>
          ) : overview ? (
            <>
              <Panel
                title={selectedHome ? `${selectedHome.name} dashboard` : 'Command center'}
                eyebrow="Phase 10 dashboard"
                actions={<div className="meta-pill">{overview.scope_home_name ?? 'All homes'}</div>}
              >
                <div className="dashboard-hero">
                  <div>
                    <p className="hero-tag">Everything that needs attention, in one view</p>
                    <h2>
                      {selectedHome
                        ? `A focused health check for ${selectedHome.name}`
                        : 'A clear command center for the whole household'}
                    </h2>
                    <p className="muted-copy">
                      This snapshot is derived from maintenance history, schedule timing, warranty
                      coverage, attached documents, and real spending.
                    </p>
                  </div>
                  <div className="dashboard-hero-stats">
                    <div className="hero-metric">
                      <span>This month</span>
                      <strong>{formatCurrency(overview.this_month_spend)}</strong>
                    </div>
                    <div className="hero-metric">
                      <span>This year</span>
                      <strong>{formatCurrency(overview.this_year_spend)}</strong>
                    </div>
                    <div className="hero-metric">
                      <span>Health signals</span>
                      <strong>{overview.overdue_count + overview.expiring_soon_count + overview.expired_warranty_count}</strong>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Upcoming maintenance" eyebrow="Next 30 days">
                {overview.upcoming_maintenance.length === 0 ? (
                  <EmptyState
                    title="Nothing coming up"
                    description="Add schedules or next due dates on maintenance records to populate this section."
                  />
                ) : (
                  <div className="schedule-list">
                    {overview.upcoming_maintenance.map((item) => (
                      <article className="schedule-card dashboard-schedule-card" key={`${item.kind}-${item.source_id}`}>
                        <div className="schedule-card-main">
                          <div className="schedule-card-head">
                            <div>
                              <strong>{item.title}</strong>
                              <p>
                                {item.home_name}
                                {item.asset_name ? ` · ${item.asset_name}` : ''}
                              </p>
                            </div>
                            <div className="schedule-tags">
                              <span className={`schedule-tag ${item.status === 'overdue' ? 'overdue' : item.status === 'due_soon' ? 'soon' : 'active'}`}>
                                {item.status === 'overdue' ? 'Overdue' : item.status === 'due_soon' ? 'Due soon' : 'On track'}
                              </span>
                              <span className="schedule-tag muted">
                                {item.kind === 'maintenance' ? 'Maintenance record' : 'Schedule'}
                              </span>
                            </div>
                          </div>
                          <p className="muted-copy">{item.description}</p>
                          <div className="schedule-meta">
                            <div>
                              <span className="detail-label">Due date</span>
                              <strong>{formatDate(item.due_date)}</strong>
                            </div>
                            <div>
                              <span className="detail-label">Home</span>
                              <strong>{item.home_name}</strong>
                            </div>
                            <div>
                              <span className="detail-label">Asset</span>
                              <strong>{item.asset_name ?? 'Unassigned'}</strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>

              <div className="split-panels">
                <Panel title="Recent activity" eyebrow="Latest changes">
                  {overview.recent_activity.length === 0 ? (
                    <EmptyState
                      title="No activity yet"
                      description="Activity will appear once you create records, schedules, documents, or warranties."
                    />
                  ) : (
                    <div className="item-list">
                      {overview.recent_activity.map((item) => (
                        <article className="item-card dashboard-activity-card" key={`${item.kind}-${item.source_id}`}>
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                            <p className="muted-copy">
                              {item.home_name}
                              {item.asset_name ? ` · ${item.asset_name}` : ''}
                            </p>
                          </div>
                          <div className="item-actions">
                            <span className="meta-pill">{formatDate(item.timestamp)}</span>
                            <span className="meta-pill">{item.kind}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Warranty alerts" eyebrow="Coverage watch">
                  {overview.warranty_alerts.length === 0 ? (
                    <EmptyState
                      title="No warranty alerts"
                      description="Expiring or expired coverage will appear here as expiration dates approach."
                    />
                  ) : (
                    <div className="item-list">
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

              <Panel title="Home health" eyebrow="Whole-house view">
                {overview.home_health.length === 0 ? (
                  <EmptyState
                    title="No home health yet"
                    description="Create homes, assets, and schedules to make this section come alive."
                  />
                ) : (
                  <div className="dashboard-health-list">
                    {overview.home_health.map((home) => (
                      <article key={home.home_id} className="dashboard-health-card">
                        <div className="dashboard-health-head">
                          <div>
                            <strong>{home.home_name}</strong>
                            <p>{home.summary}</p>
                          </div>
                          <span className={`warranty-tag ${home.status_label === 'Attention' ? 'overdue' : home.status_label === 'Watch' ? 'soon' : 'active'}`}>
                            {home.status_label}
                          </span>
                        </div>

                        <div className="dashboard-health-grid">
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

              <Panel title="Spending pulse" eyebrow="Derived from maintenance costs">
                <div className="dashboard-spending">
                  <div className="dashboard-spending-summary">
                    <div className="hero-metric">
                      <span>Total spend</span>
                      <strong>{formatCurrency(overview.spending.total_spend)}</strong>
                    </div>
                    <div className="hero-metric">
                      <span>Average record</span>
                      <strong>{formatCurrency(overview.spending.average_cost)}</strong>
                    </div>
                    <div className="hero-metric">
                      <span>Records</span>
                      <strong>{overview.spending.record_count}</strong>
                    </div>
                  </div>

                  <div className="split-panels">
                    <div className="dashboard-trend-panel">
                      <h3>Monthly trend</h3>
                      <div className="dashboard-trend-list">
                        {overview.spending.monthly_trend.map((entry) => (
                          <div className="trend-row" key={entry.label}>
                            <div className="trend-labels">
                              <strong>{entry.label}</strong>
                              <span>{entry.record_count} records</span>
                            </div>
                            <div className="trend-track">
                              <div
                                className="trend-fill"
                                style={{ width: `${pctWidth(entry.total_spend, trendMax)}%` }}
                              />
                            </div>
                            <strong className="trend-value">{formatCurrency(entry.total_spend)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="dashboard-trend-panel">
                      <h3>Top categories</h3>
                      <div className="dashboard-category-list">
                        {overview.spending.category_breakdown.slice(0, 5).map((entry) => (
                          <div className="breakdown-row" key={entry.category}>
                            <div className="breakdown-head">
                              <strong>{entry.category}</strong>
                              <span>{entry.record_count} records</span>
                            </div>
                            <div className="breakdown-track">
                              <div
                                className="breakdown-fill accent"
                                style={{ width: `${pctWidth(entry.total_spend, categoryMax)}%` }}
                              />
                            </div>
                            <strong>{formatCurrency(entry.total_spend)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </>
          ) : (
            <EmptyState
              title="No dashboard data yet"
              description="Create homes, records, schedules, documents, and warranties to populate the command center."
            />
          )}
        </section>
      </div>
    </div>
  );
}
