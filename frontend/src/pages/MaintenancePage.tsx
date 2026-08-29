import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Field, Panel } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { SlideOver } from '../components/SlideOver';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { parseHomeParam } from '../lib/routes';
import type { Asset, Home, MaintenanceCategory, MaintenanceRecord } from '../lib/types';

const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Appliance',
  'Structural',
  'Cleaning',
  'Pest Control',
  'Other',
];

type MaintenanceForm = {
  title: string;
  description: string;
  item: string;
  category: MaintenanceCategory;
  date: string;
  cost: string;
  service_provider: string;
  next_due_date: string;
  image_url: string;
  asset_id: string;
};

const emptyForm: MaintenanceForm = {
  title: '',
  description: '',
  item: '',
  category: 'HVAC',
  date: '',
  cost: '',
  service_provider: '',
  next_due_date: '',
  image_url: '',
  asset_id: '',
};

export function MaintenancePage() {
  const { accessToken, refreshSession } = useAuth();
  const { currencyCode } = usePreferences();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<MaintenanceForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assetFilter, setAssetFilter] = useState<'all' | string>('all');
  const [recordQuery, setRecordQuery] = useState('');
  const [recordSort, setRecordSort] = useState<'newest' | 'oldest' | 'cost_desc' | 'cost_asc'>('newest');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const selectedHomeId = parseHomeParam(params.get('home'));
  const selectedHome = useMemo(
    () => homes.find((home) => String(home.id) === selectedHomeId) ?? homes[0] ?? null,
    [homes, selectedHomeId],
  );

  async function loadHomes() {
    const data = await apiRequestWithRefresh<Home[]>(
      '/homes',
      {},
      () => accessToken,
      refreshSession,
    );
    setHomes(data);
    if (!selectedHomeId && data.length > 0) {
      setParams({ home: String(data[0].id) }, { replace: true });
    } else if (selectedHomeId && !data.some((home) => String(home.id) === selectedHomeId) && data.length > 0) {
      setParams({ home: String(data[0].id) }, { replace: true });
    }
  }

  async function loadDetails(homeId: number, filter: string) {
    setDetailLoading(true);
    setError('');
    try {
      const [assetsData, recordsData] = await Promise.all([
        apiRequestWithRefresh<Asset[]>(
          `/homes/${homeId}/assets`,
          {},
          () => accessToken,
          refreshSession,
        ),
        apiRequestWithRefresh<MaintenanceRecord[]>(
          filter === 'all'
            ? `/homes/${homeId}/maintenance`
            : `/homes/${homeId}/maintenance?asset_id=${filter}`,
          {},
          () => accessToken,
          refreshSession,
        ),
      ]);
      setAssets(assetsData);
      setRecords(recordsData);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    loadHomes()
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load homes.'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!selectedHome) {
      setAssets([]);
      setRecords([]);
      return;
    }
    loadDetails(selectedHome.id, assetFilter).catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not load maintenance records.'),
    );
  }, [selectedHome?.id, assetFilter, accessToken]);

  useEffect(() => {
    setAssetFilter('all');
    resetForm();
  }, [selectedHome?.id]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function openCreateForm() {
    resetForm();
    setStatus('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function startEdit(record: MaintenanceRecord) {
    setEditingId(record.id);
    setForm({
      title: record.title,
      description: record.description ?? '',
      item: record.item,
      category: record.category,
      date: record.date,
      cost: String(record.cost),
      service_provider: record.service_provider ?? '',
      next_due_date: record.next_due_date ?? '',
      image_url: record.image_url ?? '',
      asset_id: record.asset_id?.toString() ?? '',
    });
    setStatus('');
    setDrawerOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHome) return;
    setSaving(true);
    setError('');
    setStatus('');

    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      item: form.item.trim(),
      category: form.category,
      date: form.date,
      cost: Number(form.cost),
      service_provider: form.service_provider.trim() || null,
      next_due_date: form.next_due_date || null,
      image_url: form.image_url.trim() || null,
      asset_id: form.asset_id.trim() ? Number(form.asset_id) : null,
    };

    try {
      if (editingId) {
        await apiRequestWithRefresh<MaintenanceRecord>(
          `/homes/${selectedHome.id}/maintenance/${editingId}`,
          { method: 'PATCH', body },
          () => accessToken,
          refreshSession,
        );
      } else {
        await apiRequestWithRefresh<MaintenanceRecord>(
          `/homes/${selectedHome.id}/maintenance`,
          { method: 'POST', body },
          () => accessToken,
          refreshSession,
        );
      }
      await loadDetails(selectedHome.id, assetFilter);
      resetForm();
      closeDrawer();
      setStatus(editingId ? 'Maintenance record updated.' : 'Maintenance record created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save maintenance record.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: MaintenanceRecord) {
    if (!selectedHome) return;
    const snapshot = records;
    setDeletingId(record.id);
    setRecords((current) => current.filter((item) => item.id !== record.id));
    try {
      await apiRequestWithRefresh<void>(
        `/homes/${selectedHome.id}/maintenance/${record.id}`,
        { method: 'DELETE' },
        () => accessToken,
        refreshSession,
      );
      setStatus('Maintenance record deleted.');
    } catch (err) {
      setRecords(snapshot);
      setError(err instanceof Error ? err.message : 'Could not delete maintenance record.');
    } finally {
      setDeletingId(null);
    }
  }

  const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
  const upcomingCount = records.filter((record) => record.next_due_date && record.next_due_date >= new Date().toISOString().slice(0, 10)).length;
  const visibleRecords = useMemo(() => {
    const query = recordQuery.trim().toLowerCase();
    const filtered = records.filter((record) => {
      if (!query) return true;
      return [record.title, record.item, record.category, record.service_provider ?? '', record.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (recordSort) {
        case 'oldest':
          return a.date.localeCompare(b.date);
        case 'cost_desc':
          return b.cost - a.cost;
        case 'cost_asc':
          return a.cost - b.cost;
        case 'newest':
        default:
          return b.date.localeCompare(a.date);
      }
    });
    return sorted;
  }, [records, recordQuery, recordSort]);

  const homeSelector = (
    <label className="toolbar-field">
      <span className="field-label">Home</span>
      <select className="input" value={selectedHomeId} onChange={(e) => setParams({ home: e.target.value }, { replace: true })} disabled={homes.length === 0}>
        <option value="">Select a home</option>
        {homes.map((home) => (
          <option key={home.id} value={home.id}>
            {home.name}
          </option>
        ))}
      </select>
    </label>
  );

  const hasRecords = records.length > 0;

  return (
    <div className="workspace-page maintenance-page">
      <PageHeader
        title="Maintenance"
        description="Track what has been done and what needs attention next."
        actions={
          <>
            {homeSelector}
            <Button onClick={openCreateForm} disabled={!selectedHome}>
              + Add maintenance
            </Button>
          </>
        }
        filters={
          <>
            <label className="toolbar-field">
              <span className="field-label">Search</span>
              <input
                className="input"
                value={recordQuery}
                onChange={(e) => setRecordQuery(e.target.value)}
                placeholder="Search records"
              />
            </label>
            <label className="toolbar-field">
              <span className="field-label">Sort</span>
              <select className="input" value={recordSort} onChange={(e) => setRecordSort(e.target.value as typeof recordSort)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="cost_desc">Highest cost</option>
                <option value="cost_asc">Lowest cost</option>
              </select>
            </label>
            <label className="toolbar-field">
              <span className="field-label">Asset</span>
              <select className="input" value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}>
                <option value="all">All assets</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                ))}
              </select>
            </label>
          </>
        }
      />

      {hasRecords ? (
        <div className="overview-row maintenance-overview">
          <div className="stat-card">
            <span>Maintenance records</span>
            <strong>{records.length}</strong>
          </div>
          <div className="stat-card">
            <span>Upcoming</span>
            <strong>{upcomingCount}</strong>
          </div>
          <div className="stat-card">
            <span>Total spend</span>
            <strong>{formatCurrency(totalCost, currencyCode)}</strong>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="form-error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}
      {status ? (
        <div className="success-banner" role="status" aria-live="polite">
          {status}
        </div>
      ) : null}

      {loading ? (
        <Panel title="Maintenance">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading maintenance...</p>
          </div>
        </Panel>
      ) : !selectedHome ? (
        <EmptyState
          title="No homes yet"
          description="Create a home first, then return here to track upkeep."
          action={<Button href="/app/homes">Go to My Home</Button>}
        />
      ) : (
        <Panel title="Records" className="page-section">
          {detailLoading ? (
            <div className="loading-state compact">
              <div className="spinner" />
              <p>Loading maintenance...</p>
            </div>
          ) : !hasRecords ? (
            <EmptyState
              title="No maintenance records yet"
              description="Track repairs, upkeep, and routine work from this home."
            />
          ) : (
            <div className="item-list">
              {visibleRecords.map((record) => (
                <article className="item-card" key={record.id}>
                  <div>
                    <strong>{record.title}</strong>
                    <p>{record.item} · {record.category}</p>
                    <p className="muted-copy">
                      {formatDate(record.date)} · {formatCurrency(record.cost, currencyCode)}{record.service_provider ? ` · ${record.service_provider}` : ''}
                    </p>
                    {record.next_due_date ? <p className="muted-copy">Next due {formatDate(record.next_due_date)}</p> : null}
                  </div>
                  <div className="item-actions">
                    <button type="button" onClick={() => startEdit(record)} aria-label={`Edit maintenance record ${record.title}`}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(record)}
                      disabled={deletingId === record.id}
                      aria-label={`Delete maintenance record ${record.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      )}

      <SlideOver
        open={drawerOpen}
        title={editingId ? 'Edit maintenance' : 'Add maintenance'}
        description="Record the work that was done and when it needs attention again."
        onClose={closeDrawer}
      >
        <form className="stacked-form" onSubmit={submit}>
          <Field label="Title">
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Item">
            <input className="input" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} required />
          </Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MaintenanceCategory })}>
              {MAINTENANCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea className="textarea" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="two-col">
            <Field label="Date">
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>
            <Field label="Cost">
              <input className="input" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
            </Field>
          </div>
          <div className="two-col">
            <Field label="Service provider">
              <input className="input" value={form.service_provider} onChange={(e) => setForm({ ...form, service_provider: e.target.value })} />
            </Field>
            <Field label="Next due date">
              <input className="input" type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Image URL">
            <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          </Field>
          <Field label="Asset">
            <select className="input" value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}>
              <option value="">Unassigned</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name}</option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={saving}>{editingId ? 'Save record' : 'Create record'}</Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete maintenance record?"
        description={
          deleteTarget ? (
            <>
              <p>
                This will remove <strong>{deleteTarget.title}</strong> from Hupkeep.
              </p>
              <p>The action cannot be undone.</p>
            </>
          ) : null
        }
        confirmLabel="Delete record"
        destructive
        busy={deletingId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void remove(deleteTarget).finally(() => setDeleteTarget(null));
        }}
      />
    </div>
  );
}
