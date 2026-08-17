import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Panel } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { Home, SpendingOverviewResponse } from '../lib/types';

function pctWidth(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
}

export function SpendingPage() {
  const { accessToken, refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [overview, setOverview] = useState<SpendingOverviewResponse | null>(null);
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
      const data = await apiRequestWithRefresh<SpendingOverviewResponse>(
        selectedHome ? `/analytics/spending?home_id=${selectedHome.id}` : '/analytics/spending',
        {},
        () => accessToken,
        refreshSession,
      );
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load spending analytics.');
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

  const monthlyMax = Math.max(...(overview?.monthly_trend.map((entry) => entry.total_spend) ?? [0]), 0);
  const categoryMax = Math.max(...(overview?.category_breakdown.map((entry) => entry.total_spend) ?? [0]), 0);
  const assetMax = Math.max(...(overview?.asset_breakdown.map((entry) => entry.total_spend) ?? [0]), 0);

  const metrics = [
    { label: 'Total spend', value: formatCurrency(overview?.total_spend ?? 0) },
    { label: 'This month', value: formatCurrency(overview?.this_month_spend ?? 0) },
    { label: 'This year', value: formatCurrency(overview?.this_year_spend ?? 0) },
    { label: 'Previous year', value: formatCurrency(overview?.previous_year_spend ?? 0) },
    { label: 'Average per record', value: formatCurrency(overview?.average_cost ?? 0) },
  ];
  const hasRecords = (overview?.record_count ?? 0) > 0;

  return (
    <div className="homes-page">
      <div className="overview-row spending-overview">
        {metrics.map((metric) => (
          <div className="stat-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <Panel title="Scope" eyebrow="Spending view">
            <div className="scope-stack">
              <Button
                variant={!selectedHome ? 'primary' : 'secondary'}
                onClick={() => setParams({}, { replace: true })}
              >
                All homes
              </Button>
              <p className="muted-copy">
                {selectedHome
                  ? `Showing spending for ${selectedHome.name}.`
                  : 'Showing spending across every home in your account.'}
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
                description="Create a home first so spending analytics have somewhere to attach."
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
                        <span>{home.property_type} · {home.year_built}</span>
                        <em>{home.address}</em>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </aside>

        <section className="workspace-main">
          {loadingOverview ? (
            <Panel title="Spending analytics" eyebrow="Derived from maintenance history">
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading spending analytics...</p>
              </div>
            </Panel>
          ) : overview ? (
            <>
              <Panel
                title={selectedHome ? `${selectedHome.name} spending` : 'All-home spending'}
                eyebrow="Phase 7 analytics"
                actions={<div className="meta-pill">{overview.record_count} records</div>}
              >
                <div className="home-detail">
                  <div>
                    <p className="detail-label">Scope</p>
                    <strong>{overview.scope_home_name ?? 'All homes'}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Records analyzed</p>
                    <strong>{overview.record_count}</strong>
                  </div>
                </div>
              </Panel>

              <Panel title="Trend" eyebrow="Monthly spend">
                {!hasRecords ? (
                  <EmptyState
                    title="No spending data yet"
                    description="Add maintenance records with costs to populate the analytics view."
                  />
                ) : (
                  <div className="trend-list">
                    {overview.monthly_trend.map((entry) => (
                      <div className="trend-row" key={entry.label}>
                        <div className="trend-labels">
                          <strong>{entry.label}</strong>
                          <span>{entry.record_count} records</span>
                        </div>
                        <div className="trend-track">
                          <div
                            className="trend-fill"
                            style={{ width: `${pctWidth(entry.total_spend, monthlyMax)}%` }}
                          />
                        </div>
                        <strong className="trend-value">{formatCurrency(entry.total_spend)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <div className="split-panels">
                <Panel title="Categories" eyebrow="Where the money goes">
                  {!hasRecords ? (
                    <EmptyState
                      title="No categories yet"
                      description="Maintenance records will roll into category totals automatically."
                    />
                  ) : (
                    <div className="breakdown-list">
                      {overview.category_breakdown.map((entry) => (
                        <div className="breakdown-row" key={entry.category}>
                          <div className="breakdown-head">
                            <strong>{entry.category}</strong>
                            <span>{entry.record_count} records</span>
                          </div>
                          <div className="breakdown-track">
                            <div
                              className="breakdown-fill"
                              style={{ width: `${pctWidth(entry.total_spend, categoryMax)}%` }}
                            />
                          </div>
                          <strong>{formatCurrency(entry.total_spend)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Assets" eyebrow="Highest spend">
                  {!hasRecords ? (
                    <EmptyState
                      title="No asset spending yet"
                      description="Assign maintenance records to assets to see which systems cost the most."
                    />
                  ) : (
                    <div className="breakdown-list">
                      {overview.asset_breakdown.map((entry) => (
                        <div className="breakdown-row" key={`${entry.asset_id ?? 'unassigned'}-${entry.asset_name}`}>
                          <div className="breakdown-head">
                            <strong>{entry.asset_name}</strong>
                            <span>{entry.record_count} records</span>
                          </div>
                          <div className="breakdown-track">
                            <div
                              className="breakdown-fill accent"
                              style={{ width: `${pctWidth(entry.total_spend, assetMax)}%` }}
                            />
                          </div>
                          <strong>{formatCurrency(entry.total_spend)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              <Panel title="Recent spend" eyebrow="Latest entries">
                {!hasRecords ? (
                  <EmptyState
                    title="No recent spend"
                    description="Create maintenance records to populate the recent activity feed."
                  />
                ) : (
                  <div className="item-list">
                    {overview.recent_records.map((record) => (
                      <article className="item-card" key={record.id}>
                        <div>
                          <strong>{record.title}</strong>
                          <p>
                            {record.category} · {formatCurrency(record.cost)}
                            {record.service_provider ? ` · ${record.service_provider}` : ''}
                          </p>
                          <p className="muted-copy">
                            {formatDate(record.date)} · {record.home_name}
                            {record.asset_name ? ` · ${record.asset_name}` : ''}
                          </p>
                        </div>
                        <div className="item-actions">
                          <span className="meta-pill">{formatDate(record.created_at)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </>
          ) : (
            <EmptyState
              title="No analytics yet"
              description="Add maintenance records with costs to generate the spending view."
            />
          )}
        </section>
      </div>
    </div>
  );
}
