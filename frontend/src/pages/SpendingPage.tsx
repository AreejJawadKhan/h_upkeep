import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Panel } from '../components/UI';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import { parseHomeParam } from '../lib/routes';
import type { Home, SpendingOverviewResponse } from '../lib/types';

function pctWidth(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
}

export function SpendingPage() {
  const { accessToken, refreshSession } = useAuth();
  const { currencyCode } = usePreferences();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [overview, setOverview] = useState<SpendingOverviewResponse | null>(null);
  const [loadingHomes, setLoadingHomes] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState('');

  const selectedHomeId = parseHomeParam(params.get('home'));
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
    { label: 'Total spend', value: formatCurrency(overview?.total_spend ?? 0, currencyCode) },
    { label: 'This month', value: formatCurrency(overview?.this_month_spend ?? 0, currencyCode) },
    { label: 'This year', value: formatCurrency(overview?.this_year_spend ?? 0, currencyCode) },
    { label: 'Previous year', value: formatCurrency(overview?.previous_year_spend ?? 0, currencyCode) },
    { label: 'Average per record', value: formatCurrency(overview?.average_cost ?? 0, currencyCode) },
  ];
  const hasRecords = (overview?.record_count ?? 0) > 0;

  return (
    <div className="homes-page">
      <PageHeader
        eyebrow="Hupkeep"
        title="Spending"
        description="Review home costs, monthly trends, and the records driving the totals."
        filters={
          <>
            <Button
              variant={!selectedHome ? 'primary' : 'secondary'}
              onClick={() => setParams({}, { replace: true })}
            >
              All homes
            </Button>
            <label>
              <span className="field-label">Home</span>
              <select
                className="input"
                value={selectedHome?.id?.toString() ?? ''}
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
          </>
        }
      />

      <div className="overview-row spending-overview">
        {metrics.map((metric) => (
          <div className="stat-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loadingOverview ? (
        <Panel title="Spending" eyebrow="Overview">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading spending summary...</p>
          </div>
        </Panel>
      ) : overview ? (
        <>
          {!hasRecords ? (
            <EmptyState
              title="No spending yet"
              description="Add maintenance records with costs to start tracking expenses."
              action={<Button href="/app/maintenance">Add maintenance</Button>}
            />
          ) : (
            <div className="split-panels">
              <Panel title="Trend" eyebrow="Monthly spend">
                <div className="trend-list trend-scroll">
                  {overview.monthly_trend.slice(-6).map((entry) => (
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
                      <strong className="trend-value">{formatCurrency(entry.total_spend, currencyCode)}</strong>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Breakdown" eyebrow="Where the money goes">
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
                      <strong>{formatCurrency(entry.total_spend, currencyCode)}</strong>
                    </div>
                  ))}
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
                      <strong>{formatCurrency(entry.total_spend, currencyCode)}</strong>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          <Panel title="Recent spend" eyebrow="Latest entries">
            <div className="item-list">
              {overview.recent_records.map((record) => (
                <article className="item-card" key={record.id}>
                  <div>
                    <strong>{record.title}</strong>
                    <p>
                      {record.category} · {formatCurrency(record.cost, currencyCode)}
                      {record.service_provider ? ` · ${record.service_provider}` : ''}
                    </p>
                    <p className="muted-copy">
                      {formatDate(record.date)} · {record.home_name}
                      {record.asset_name ? ` · ${record.asset_name}` : ''}
                    </p>
                  </div>
                  <div className="item-actions">
                    <span className="meta-pill">{formatDateTime(record.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState
          title="No analytics yet"
          description="Add maintenance records with costs to generate the spending view."
        />
      )}
    </div>
  );
}
