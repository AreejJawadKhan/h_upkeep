import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Field, Panel } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatDate } from '../lib/format';
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

  const selectedHomeId = params.get('home') ?? '';
  const selectedHome = useMemo(
    () => homes.find((home) => String(home.id) === selectedHomeId) ?? homes[0] ?? null,
    [homes, selectedHomeId],
  );

  const selectedAssetLabel = useMemo(() => {
    if (assetFilter === 'all') return 'All assets';
    return assets.find((asset) => String(asset.id) === assetFilter)?.name ?? 'Selected asset';
  }, [assetFilter, assets]);

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
      setStatus(editingId ? 'Warranty updated.' : 'Warranty created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save warranty.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(warranty: Warranty) {
    if (!selectedHome) return;
    if (!window.confirm(`Delete the warranty from ${warranty.provider}?`)) return;

    try {
      await apiRequestWithRefresh<void>(
        `/homes/${selectedHome.id}/warranties/${warranty.id}`,
        { method: 'DELETE' },
        () => accessToken,
        refreshSession,
      );
      await loadDetails(selectedHome.id, assetFilter);
      setStatus('Warranty deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete warranty.');
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

  return (
    <div className="homes-page">
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

      {error ? <div className="form-error">{error}</div> : null}
      {status ? <div className="success-banner">{status}</div> : null}

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <Panel
            title={editingId ? 'Edit warranty' : 'Add warranty'}
            eyebrow="Warranty tracking"
            actions={editingId ? <Button variant="ghost" onClick={resetForm}>Cancel</Button> : null}
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
                <span className="field-hint">Documents are pulled from the selected home.</span>
              </Field>
              <Button type="submit" disabled={saving}>
                {editingId ? 'Save warranty' : 'Create warranty'}
              </Button>
            </form>
          </Panel>

          <Panel title="Homes" eyebrow="Switch context">
            {loading ? (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading homes...</p>
              </div>
            ) : homes.length === 0 ? (
              <EmptyState
                title="No homes yet"
                description="Create a home first, then attach warranties to its assets."
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
        </aside>

        <section className="workspace-main">
          {selectedHome ? (
            <>
              <Panel
                title={`${selectedHome.name} warranties`}
                eyebrow="Selected home"
                actions={<div className="meta-pill">{selectedAssetLabel}</div>}
              >
                <div className="home-detail">
                  <div>
                    <p className="detail-label">Assets available</p>
                    <strong>{assets.length}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Documents available</p>
                    <strong>{documents.length}</strong>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Warranties"
                eyebrow="Coverage timeline"
                actions={
                  <label>
                    <span className="field-label">Filter by asset</span>
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
                }
              >
                {detailLoading ? (
                  <div className="loading-state compact">
                    <div className="spinner" />
                    <p>Loading warranties...</p>
                  </div>
                ) : warranties.length === 0 ? (
                  <EmptyState
                    title="No warranties yet"
                    description="Add a warranty to keep expiration dates, providers, and supporting documents in one place."
                  />
                ) : (
                  <div className="warranty-list">
                    {warranties.map((warranty) => {
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
                            <Button variant="ghost" onClick={() => void remove(warranty)}>
                              Delete
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </>
          ) : (
            <EmptyState
              title="No home selected"
              description="Choose a home to manage its warranties and expiration dates."
            />
          )}
        </section>
      </div>
    </div>
  );
}
