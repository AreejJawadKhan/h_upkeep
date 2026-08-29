import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Field, Panel } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { SlideOver } from '../components/SlideOver';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatDate } from '../lib/format';
import { parseHomeParam } from '../lib/routes';
import type { Asset, Home, HomeDocument, Warranty } from '../lib/types';

type WarrantyForm = {
  provider: string;
  coverage_details: string;
  start_date: string;
  expiration_date: string;
  asset_id: string;
  document_id: string;
};

const emptyForm: WarrantyForm = {
  provider: '',
  coverage_details: '',
  start_date: '',
  expiration_date: '',
  asset_id: '',
  document_id: '',
};

function getDocLabel(document: HomeDocument | undefined) {
  if (!document) return 'No document linked';
  return `${document.file_name} · ${document.maintenance_title}`;
}

export function WarrantiesPage() {
  const { accessToken, refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [documents, setDocuments] = useState<HomeDocument[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<WarrantyForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assetFilter, setAssetFilter] = useState<'all' | string>('all');
  const [warrantyQuery, setWarrantyQuery] = useState('');
  const [warrantySort, setWarrantySort] = useState<'expiring_soon' | 'newest' | 'provider'>('expiring_soon');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Warranty | null>(null);
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
      return;
    }
    if (
      selectedHomeId &&
      !data.some((home) => String(home.id) === selectedHomeId) &&
      data.length > 0
    ) {
      setParams({ home: String(data[0].id) }, { replace: true });
    }
  }

  async function loadDetails(homeId: number, filter: string) {
    setDetailLoading(true);
    setError('');
    try {
      const [assetsData, documentsData, warrantiesData] = await Promise.all([
        apiRequestWithRefresh<Asset[]>(
          `/homes/${homeId}/assets`,
          {},
          () => accessToken,
          refreshSession,
        ),
        apiRequestWithRefresh<HomeDocument[]>(
          `/homes/${homeId}/documents`,
          {},
          () => accessToken,
          refreshSession,
        ),
        apiRequestWithRefresh<Warranty[]>(
          filter === 'all'
            ? `/homes/${homeId}/warranties`
            : `/homes/${homeId}/warranties?asset_id=${filter}`,
          {},
          () => accessToken,
          refreshSession,
        ),
      ]);
      setAssets(assetsData);
      setDocuments(documentsData);
      setWarranties(warrantiesData);
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
      setDocuments([]);
      setWarranties([]);
      return;
    }

    loadDetails(selectedHome.id, assetFilter).catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not load warranties.'),
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

  function startEdit(warranty: Warranty) {
    setEditingId(warranty.id);
    setForm({
      provider: warranty.provider,
      coverage_details: warranty.coverage_details ?? '',
      start_date: warranty.start_date,
      expiration_date: warranty.expiration_date,
      asset_id: warranty.asset_id.toString(),
      document_id: warranty.document_id?.toString() ?? '',
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
      provider: form.provider.trim(),
      coverage_details: form.coverage_details.trim() || null,
      start_date: form.start_date,
      expiration_date: form.expiration_date,
      asset_id: Number(form.asset_id),
      document_id: form.document_id.trim() ? Number(form.document_id) : null,
    };

    try {
      if (editingId) {
        await apiRequestWithRefresh<Warranty>(
          `/homes/${selectedHome.id}/warranties/${editingId}`,
          { method: 'PATCH', body },
          () => accessToken,
          refreshSession,
        );
      } else {
        await apiRequestWithRefresh<Warranty>(
          `/homes/${selectedHome.id}/warranties`,
          { method: 'POST', body },
          () => accessToken,
          refreshSession,
        );
      }
      await loadDetails(selectedHome.id, assetFilter);
      resetForm();
      closeDrawer();
      setStatus(editingId ? 'Warranty updated.' : 'Warranty created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save warranty.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(warranty: Warranty) {
    if (!selectedHome) return;
    const snapshot = warranties;
    setDeletingId(warranty.id);
    setWarranties((current) => current.filter((item) => item.id !== warranty.id));
    try {
      await apiRequestWithRefresh<void>(
        `/homes/${selectedHome.id}/warranties/${warranty.id}`,
        { method: 'DELETE' },
        () => accessToken,
        refreshSession,
      );
      setStatus('Warranty deleted.');
    } catch (err) {
      setWarranties(snapshot);
      setError(err instanceof Error ? err.message : 'Could not delete warranty.');
    } finally {
      setDeletingId(null);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const dueSoonCutoff = new Date();
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 30);
  const dueSoonIso = dueSoonCutoff.toISOString().slice(0, 10);

  const linkedDocumentsCount = warranties.filter((warranty) => warranty.document_id !== null).length;
  const expiringSoonCount = warranties.filter((warranty) => {
    if (!warranty.expiration_date) return false;
    return warranty.expiration_date >= todayIso && warranty.expiration_date <= dueSoonIso;
  }).length;
  const expiredCount = warranties.filter((warranty) => warranty.expiration_date < todayIso).length;
  const activeCount = warranties.length - expiredCount;
  const visibleWarranties = useMemo(() => {
    const query = warrantyQuery.trim().toLowerCase();
    const filtered = warranties.filter((warranty) => {
      if (!query) return true;
      const assetName = assets.find((asset) => asset.id === warranty.asset_id)?.name ?? '';
      const document = documents.find((item) => item.id === warranty.document_id);
      return [warranty.provider, warranty.coverage_details ?? '', assetName, document?.file_name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (warrantySort) {
        case 'provider':
          return a.provider.localeCompare(b.provider);
        case 'newest':
          return b.start_date.localeCompare(a.start_date);
        case 'expiring_soon':
        default:
          return a.expiration_date.localeCompare(b.expiration_date);
      }
    });
    return sorted;
  }, [assets, documents, warrantyQuery, warrantySort, warranties]);

  const homeSelector = (
    <label className="toolbar-field">
      <span className="field-label">Home</span>
      <select
        className="input"
        value={selectedHomeId}
        onChange={(e) => setParams({ home: e.target.value }, { replace: true })}
        disabled={homes.length === 0}
      >
        <option value="">Select a home</option>
        {homes.map((home) => (
          <option key={home.id} value={home.id}>
            {home.name}
          </option>
        ))}
      </select>
    </label>
  );

  const hasWarranties = warranties.length > 0;

  return (
    <div className="workspace-page warranties-page">
      <PageHeader
        title="Warranties"
        description="Keep coverage dates, linked assets, and supporting documents visible."
        actions={
          <>
            {homeSelector}
            <Button onClick={openCreateForm} disabled={!selectedHome}>
              + Add warranty
            </Button>
          </>
        }
        filters={
          <>
            <label className="toolbar-field">
              <span className="field-label">Search</span>
              <input
                className="input"
                value={warrantyQuery}
                onChange={(e) => setWarrantyQuery(e.target.value)}
                placeholder="Search warranties"
              />
            </label>
            <label className="toolbar-field">
              <span className="field-label">Sort</span>
              <select
                className="input"
                value={warrantySort}
                onChange={(e) => setWarrantySort(e.target.value as typeof warrantySort)}
              >
                <option value="expiring_soon">Expiring soon</option>
                <option value="newest">Newest</option>
                <option value="provider">Provider</option>
              </select>
            </label>
            <label className="toolbar-field">
              <span className="field-label">Asset</span>
              <select
                className="input"
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
              >
                <option value="all">All assets</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />

      {hasWarranties ? (
        <div className="overview-row warranties-overview">
          <div className="stat-card">
            <span>Warranties</span>
            <strong>{warranties.length}</strong>
          </div>
          <div className="stat-card">
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="stat-card">
            <span>Expiring soon</span>
            <strong>{expiringSoonCount}</strong>
          </div>
          <div className="stat-card">
            <span>Linked docs</span>
            <strong>{linkedDocumentsCount}</strong>
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
        <Panel title="Warranties">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading warranties...</p>
          </div>
        </Panel>
      ) : !selectedHome ? (
        <EmptyState
          title="No homes yet"
          description="Create a home first, then attach warranties to its assets."
          action={<Button href="/app/homes">Go to My Home</Button>}
        />
      ) : (
        <Panel title="Coverage timeline" className="page-section">
          {detailLoading ? (
            <div className="loading-state compact">
              <div className="spinner" />
              <p>Loading warranties...</p>
            </div>
          ) : !hasWarranties ? (
            <EmptyState
              title="No warranties yet"
              description="Add a warranty to keep expiration dates, providers, and supporting documents in one place."
            />
          ) : (
            <div className="warranty-list">
              {visibleWarranties.map((warranty) => {
                const assetName = assets.find((asset) => asset.id === warranty.asset_id)?.name ?? 'Asset';
                const document = documents.find((item) => item.id === warranty.document_id);
                const isExpired = warranty.expiration_date < todayIso;
                const isExpiringSoon =
                  warranty.expiration_date >= todayIso && warranty.expiration_date <= dueSoonIso;

                return (
                  <article className="warranty-card" key={warranty.id}>
                    <div className="warranty-card-main">
                      <div className="warranty-card-head">
                        <div>
                          <strong>{warranty.provider}</strong>
                          <p>{assetName} · Ends {formatDate(warranty.expiration_date)}</p>
                        </div>
                        <div className="warranty-tags">
                          {isExpired ? <span className="warranty-tag overdue">Expired</span> : null}
                          {!isExpired && isExpiringSoon ? <span className="warranty-tag soon">Expiring soon</span> : null}
                          {!isExpired && !isExpiringSoon ? <span className="warranty-tag active">Covered</span> : null}
                          {warranty.document_id ? <span className="warranty-tag muted">Document linked</span> : null}
                        </div>
                      </div>

                      {warranty.coverage_details ? (
                        <p className="muted-copy">{warranty.coverage_details}</p>
                      ) : (
                        <p className="muted-copy">No coverage notes were added.</p>
                      )}

                      <div className="warranty-meta">
                        <div>
                          <span className="detail-label">Started</span>
                          <strong>{formatDate(warranty.start_date)}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Expires</span>
                          <strong>{formatDate(warranty.expiration_date)}</strong>
                        </div>
                        <div>
                          <span className="detail-label">Document</span>
                          <strong>{getDocLabel(document)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="warranty-actions item-actions">
                      <Button variant="accent" onClick={() => startEdit(warranty)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteTarget(warranty)}
                        disabled={deletingId === warranty.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      <SlideOver
        open={drawerOpen}
        title={editingId ? 'Edit warranty' : 'Add warranty'}
        description="Track the dates, provider, and asset coverage in one place."
        onClose={closeDrawer}
      >
        <form className="stacked-form" onSubmit={submit}>
          <Field label="Provider">
            <input
              className="input"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              required
            />
          </Field>
          <Field label="Coverage details">
            <textarea
              className="textarea"
              rows={4}
              value={form.coverage_details}
              onChange={(e) => setForm({ ...form, coverage_details: e.target.value })}
              placeholder="What the coverage includes, exclusions, or key notes."
            />
          </Field>
          <div className="two-col">
            <Field label="Start date">
              <input
                className="input"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </Field>
            <Field label="Expiration date">
              <input
                className="input"
                type="date"
                value={form.expiration_date}
                onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Asset">
            <select
              className="input"
              value={form.asset_id}
              onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
              required
            >
              <option value="" disabled>
                Choose an asset
              </option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supporting document">
            <select
              className="input"
              value={form.document_id}
              onChange={(e) => setForm({ ...form, document_id: e.target.value })}
            >
              <option value="">No document linked</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {getDocLabel(document)}
                </option>
              ))}
            </select>
          </Field>
          <div className="field-hint">Documents are pulled from the selected home.</div>
          <Button type="submit" disabled={saving}>
            {editingId ? 'Save warranty' : 'Create warranty'}
          </Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete warranty?"
        description={
          deleteTarget ? (
            <>
              <p>
                This will remove the warranty from <strong>{deleteTarget.provider}</strong>.
              </p>
              <p>The record can be recreated later if needed.</p>
            </>
          ) : null
        }
        confirmLabel="Delete warranty"
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
