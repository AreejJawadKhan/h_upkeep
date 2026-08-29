import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Field, Panel, Button } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { SlideOver } from '../components/SlideOver';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { parseHomeParam } from '../lib/routes';
import type { Area, Asset, Home } from '../lib/types';
import { formatDateTime } from '../lib/format';

type HomeForm = {
  name: string;
  address: string;
  property_type: string;
  year_built: string;
};

type AreaForm = {
  name: string;
  notes: string;
};

type AssetForm = {
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  installation_date: string;
  expected_lifespan: string;
  notes: string;
  area_id: string;
};

const emptyHome: HomeForm = { name: '', address: '', property_type: '', year_built: '' };
const emptyArea: AreaForm = { name: '', notes: '' };
const emptyAsset: AssetForm = {
  name: '',
  category: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  purchase_date: '',
  installation_date: '',
  expected_lifespan: '',
  notes: '',
  area_id: '',
};

export function HomesPage() {
  const { accessToken, refreshSession, createHome, updateHome, deleteHome, createArea, updateArea, deleteArea, createAsset, updateAsset, deleteAsset } = useAuth();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const selectedHomeId = parseHomeParam(params.get('home'));
  const selectedHome = useMemo(
    () => homes.find((home) => String(home.id) === selectedHomeId) ?? homes[0] ?? null,
    [homes, selectedHomeId],
  );

  const [homeForm, setHomeForm] = useState<HomeForm>(emptyHome);
  const [homeEditId, setHomeEditId] = useState<number | null>(null);
  const [areaForm, setAreaForm] = useState<AreaForm>(emptyArea);
  const [areaEditId, setAreaEditId] = useState<number | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAsset);
  const [assetEditId, setAssetEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawer, setDrawer] = useState<'home' | 'area' | 'asset' | null>(null);
  const [homeQuery, setHomeQuery] = useState('');
  const [homeSort, setHomeSort] = useState<'name' | 'recent'>('name');
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'home'; item: Home }
    | { kind: 'area'; item: Area }
    | { kind: 'asset'; item: Asset }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  async function loadHomes(preferredHomeId?: number) {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequestWithRefresh<Home[]>(
        '/homes',
        {},
        () => accessToken,
        refreshSession,
      );
      setHomes(data);

      const preferredHome =
        preferredHomeId !== undefined ? data.find((home) => home.id === preferredHomeId) ?? null : null;

      if (preferredHome) {
        setParams({ home: String(preferredHome.id) }, { replace: true });
      } else if (!selectedHomeId && data.length > 0) {
        setParams({ home: String(data[0].id) }, { replace: true });
      } else if (selectedHomeId && !data.some((home) => String(home.id) === selectedHomeId) && data.length > 0) {
        setParams({ home: String(data[0].id) }, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load homes.');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(homeId: number, filterAreaId: string) {
    setDetailLoading(true);
    try {
      const [areasData, assetsData] = await Promise.all([
        apiRequestWithRefresh<Area[]>(
          `/homes/${homeId}/areas`,
          {},
          () => accessToken,
          refreshSession,
        ),
        apiRequestWithRefresh<Asset[]>(
          filterAreaId === 'all'
            ? `/homes/${homeId}/assets`
            : `/homes/${homeId}/assets?area_id=${filterAreaId}`,
          {},
          () => accessToken,
          refreshSession,
        ),
      ]);
      setAreas(areasData);
      setAssets(assetsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the selected home.');
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      void loadHomes();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!selectedHome) {
      setAreas([]);
      setAssets([]);
      return;
    }
    void loadDetails(selectedHome.id, selectedAreaFilter);
  }, [selectedHome?.id, selectedAreaFilter, accessToken]);

  useEffect(() => {
    setSelectedAreaFilter('all');
    resetAreaForm();
    resetAssetForm();
  }, [selectedHome?.id]);

  function resetHomeForm() {
    setHomeForm(emptyHome);
    setHomeEditId(null);
  }

  function resetAreaForm() {
    setAreaForm(emptyArea);
    setAreaEditId(null);
  }

  function resetAssetForm() {
    setAssetForm(emptyAsset);
    setAssetEditId(null);
  }

  function closeDrawer() {
    setDrawer(null);
  }

  function startNewHome() {
    resetHomeForm();
    setActionMessage('');
    setDrawer('home');
  }

  function startNewArea() {
    if (!selectedHome) return;
    resetAreaForm();
    setActionMessage('');
    setDrawer('area');
  }

  function startNewAsset() {
    if (!selectedHome) return;
    resetAssetForm();
    setActionMessage('');
    setDrawer('asset');
  }

  async function submitHome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...homeForm,
        year_built: Number(homeForm.year_built),
      };
      const saved = homeEditId
        ? await updateHome(homeEditId, payload)
        : await createHome(payload);
      await loadHomes(saved.id);
      resetHomeForm();
      closeDrawer();
      setActionMessage(homeEditId ? 'Home updated.' : 'Home created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the home.');
    } finally {
      setSaving(false);
    }
  }

  async function submitArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHome) return;
    setSaving(true);
    setError('');
    try {
      if (areaEditId) {
        await updateArea(selectedHome.id, areaEditId, areaForm);
      } else {
        await createArea(selectedHome.id, areaForm);
      }
      await loadDetails(selectedHome.id, selectedAreaFilter);
      resetAreaForm();
      closeDrawer();
      setActionMessage(areaEditId ? 'Area updated.' : 'Area created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the area.');
    } finally {
      setSaving(false);
    }
  }

  async function submitAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHome) return;
    setSaving(true);
    setError('');
    try {
      if (assetEditId) {
        await updateAsset(selectedHome.id, assetEditId, assetForm);
      } else {
        await createAsset(selectedHome.id, assetForm);
      }
      await loadDetails(selectedHome.id, selectedAreaFilter);
      resetAssetForm();
      closeDrawer();
      setActionMessage(assetEditId ? 'Asset updated.' : 'Asset created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the asset.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHome(home: Home) {
    setError('');
    try {
      await deleteHome(home.id);
      await loadHomes();
      resetHomeForm();
      if (String(home.id) === selectedHome?.id?.toString()) {
        setParams({}, { replace: true });
      }
      setActionMessage('Home deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the home.');
    }
  }

  async function handleDeleteArea(area: Area) {
    if (!selectedHome) return;
    setError('');
    try {
      await deleteArea(selectedHome.id, area.id);
      await loadDetails(selectedHome.id, selectedAreaFilter);
      setActionMessage('Area deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the area.');
    }
  }

  async function handleDeleteAsset(asset: Asset) {
    if (!selectedHome) return;
    setError('');
    try {
      await deleteAsset(selectedHome.id, asset.id);
      await loadDetails(selectedHome.id, selectedAreaFilter);
      setActionMessage('Asset deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the asset.');
    }
  }

  function startHomeEdit(home: Home) {
    setHomeEditId(home.id);
    setHomeForm({
      name: home.name,
      address: home.address,
      property_type: home.property_type,
      year_built: String(home.year_built),
    });
    setActionMessage('');
    setDrawer('home');
  }

  function startAreaEdit(area: Area) {
    setAreaEditId(area.id);
    setAreaForm({
      name: area.name,
      notes: area.notes ?? '',
    });
    setActionMessage('');
    setDrawer('area');
  }

  function startAssetEdit(asset: Asset) {
    setAssetEditId(asset.id);
    setAssetForm({
      name: asset.name,
      category: asset.category,
      manufacturer: asset.manufacturer ?? '',
      model: asset.model ?? '',
      serial_number: asset.serial_number ?? '',
      purchase_date: asset.purchase_date ?? '',
      installation_date: asset.installation_date ?? '',
      expected_lifespan: asset.expected_lifespan?.toString() ?? '',
      notes: asset.notes ?? '',
      area_id: asset.area_id?.toString() ?? '',
    });
    setActionMessage('');
    setDrawer('asset');
  }

  const visibleHomes = useMemo(() => {
    const query = homeQuery.trim().toLowerCase();
    const filtered = homes.filter((home) => {
      if (!query) return true;
      return [home.name, home.address, home.property_type, String(home.year_built)]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (homeSort) {
        case 'recent':
          return b.created_at.localeCompare(a.created_at);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  }, [homeQuery, homeSort, homes]);

  const stats = [
    { label: 'Homes', value: homes.length.toString() },
    { label: 'Areas', value: areas.length.toString() },
    { label: 'Assets', value: assets.length.toString() },
  ];

  return (
    <div className="workspace-page homes-page">
      <PageHeader
        title="My Home"
        description="Keep homes, areas, and assets organized without burying the page in forms."
        actions={<Button onClick={startNewHome}>+ Add home</Button>}
        filters={
          <>
            <label className="toolbar-field">
              <span className="field-label">Search</span>
              <input
                className="input"
                value={homeQuery}
                onChange={(e) => setHomeQuery(e.target.value)}
                placeholder="Search homes"
              />
            </label>
            <label className="toolbar-field">
              <span className="field-label">Sort</span>
              <select className="input" value={homeSort} onChange={(e) => setHomeSort(e.target.value as typeof homeSort)}>
                <option value="name">Name</option>
                <option value="recent">Recently added</option>
              </select>
            </label>
          </>
        }
      />

      <div className="overview-row">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      {error ? (
        <div className="form-error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="success-banner" role="status" aria-live="polite">
          {actionMessage}
        </div>
      ) : null}

      <div className="workspace-grid management-grid">
        <aside className="workspace-sidebar">
          <Panel title="Homes" actions={<Button variant="ghost" onClick={startNewHome}>+ Add home</Button>}>
            {loading ? (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading homes...</p>
              </div>
            ) : homes.length === 0 ? (
              <EmptyState
                title="No homes yet"
                description="Add your first home to start tracking rooms, repairs, and upkeep."
                action={<Button onClick={startNewHome}>Add home</Button>}
              />
            ) : (
              <div className="home-grid">
                {visibleHomes.map((home) => {
                  const active = String(home.id) === selectedHome?.id?.toString();
                  return (
                    <article key={home.id} className={`home-card ${active ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="home-card-body"
                        aria-pressed={active}
                        aria-label={`Select ${home.name}`}
                        onClick={() => setParams({ home: String(home.id) })}
                      >
                        <strong>{home.name}</strong>
                        <span>{home.property_type} · {home.year_built}</span>
                        <em>{home.address}</em>
                      </button>
                      <div className="home-actions">
                        <button type="button" onClick={() => startHomeEdit(home)} aria-label={`Edit ${home.name}`}>
                          Edit
                        </button>
                        <button type="button" onClick={() => setDeleteTarget({ kind: 'home', item: home })} aria-label={`Delete ${home.name}`}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>

          {homes.length === 0 ? (
            <Panel title="How it works">
              <div className="preview-list">
                <div className="preview-item">
                  <strong>Add areas from the selected home</strong>
                  <span>Keep rooms and zones grouped under one place.</span>
                </div>
                <div className="preview-item">
                  <strong>Add assets when you need detail</strong>
                  <span>Track appliances, systems, and other important items separately.</span>
                </div>
              </div>
            </Panel>
          ) : null}
        </aside>

        <section className="workspace-main">
          {selectedHome ? (
            <>
              <Panel
                title={selectedHome.name}
                eyebrow="Selected home"
                actions={
                  <div className="panel-actions">
                    <Button variant="secondary" onClick={startNewArea}>
                      + Add area
                    </Button>
                    <Button onClick={startNewAsset}>+ Add asset</Button>
                  </div>
                }
              >
                <div className="home-detail">
                  <div>
                    <p className="detail-label">Address</p>
                    <strong>{selectedHome.address}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Created</p>
                    <strong>{formatDateTime(selectedHome.created_at)}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Type</p>
                    <strong>{selectedHome.property_type}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Built</p>
                    <strong>{selectedHome.year_built}</strong>
                  </div>
                </div>
              </Panel>

              <div className="split-panels">
                <Panel
                  title="Areas"
                  eyebrow="Home zones"
                  actions={<Button variant="ghost" onClick={startNewArea}>+ Add area</Button>}
                >
                  <div className="item-list">
                    {areas.length === 0 ? (
                      <EmptyState
                        title="No areas yet"
                        description="Add rooms or zones to keep the home organized."
                        action={<Button onClick={startNewArea}>Add area</Button>}
                      />
                    ) : areas.map((area) => (
                      <article className="item-card" key={area.id}>
                        <div>
                          <strong>{area.name}</strong>
                          {area.notes ? <p>{area.notes}</p> : <p className="muted-copy">No notes yet.</p>}
                        </div>
                        <div className="item-actions">
                          <button type="button" onClick={() => startAreaEdit(area)} aria-label={`Edit area ${area.name}`}>
                            Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget({ kind: 'area', item: area })} aria-label={`Delete area ${area.name}`}>
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title="Assets"
                  eyebrow="Maintainable things"
                  actions={
                    <div className="panel-actions">
                      <label className="asset-toolbar">
                        <span className="field-label">Area</span>
                        <select
                          className="input"
                          value={selectedAreaFilter}
                          onChange={(e) => setSelectedAreaFilter(e.target.value)}
                        >
                          <option value="all">All areas</option>
                          {areas.map((area) => (
                            <option key={area.id} value={area.id}>{area.name}</option>
                          ))}
                        </select>
                      </label>
                      <Button onClick={startNewAsset}>+ Add asset</Button>
                    </div>
                  }
                >
                  <div className="item-list">
                    {detailLoading ? (
                      <div className="loading-state compact">
                        <div className="spinner" />
                        <p>Loading assets...</p>
                      </div>
                    ) : assets.length === 0 ? (
                      <EmptyState
                        title="No assets yet"
                        description="Add appliances, systems, or tools tied to this home."
                        action={<Button onClick={startNewAsset}>Add asset</Button>}
                      />
                    ) : assets.map((asset) => (
                      <article className="item-card" key={asset.id}>
                        <div>
                          <strong>{asset.name}</strong>
                          <p>{asset.category}{asset.area_id ? ` · Area ${asset.area_id}` : ''}</p>
                          <p className="muted-copy">{asset.manufacturer || 'No manufacturer'} · {asset.model || 'No model'}</p>
                        </div>
                        <div className="item-actions">
                          <button type="button" onClick={() => startAssetEdit(asset)} aria-label={`Edit asset ${asset.name}`}>
                            Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget({ kind: 'asset', item: asset })} aria-label={`Delete asset ${asset.name}`}>
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          ) : (
            <EmptyState
              title="No home selected"
              description="Create a home or pick one from the list to begin."
              action={<Button onClick={startNewHome}>Add home</Button>}
            />
          )}
        </section>
      </div>

      <SlideOver
        open={drawer === 'home'}
        title={homeEditId ? 'Edit home' : 'Add home'}
        description="Enter the basic details for a new place."
        onClose={closeDrawer}
      >
        <form className="stacked-form" onSubmit={submitHome}>
          <Field label="Home name">
            <input className="input" value={homeForm.name} onChange={(e) => setHomeForm({ ...homeForm, name: e.target.value })} required />
          </Field>
          <Field label="Address">
            <textarea className="textarea" rows={3} value={homeForm.address} onChange={(e) => setHomeForm({ ...homeForm, address: e.target.value })} required />
          </Field>
          <div className="two-col">
            <Field label="Property type">
              <input className="input" value={homeForm.property_type} onChange={(e) => setHomeForm({ ...homeForm, property_type: e.target.value })} required />
            </Field>
            <Field label="Year built">
              <input className="input" type="number" value={homeForm.year_built} onChange={(e) => setHomeForm({ ...homeForm, year_built: e.target.value })} required />
            </Field>
          </div>
          <Button type="submit" disabled={saving}>{homeEditId ? 'Save home' : 'Create home'}</Button>
        </form>
      </SlideOver>

      <SlideOver
        open={drawer === 'area'}
        title={areaEditId ? 'Edit area' : 'Add area'}
        description={selectedHome ? `Add a room or zone for ${selectedHome.name}.` : 'Add a room or zone.'}
        onClose={closeDrawer}
      >
        <form className="stacked-form" onSubmit={submitArea}>
          <Field label="Area name">
            <input className="input" value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} required />
          </Field>
          <Field label="Notes">
            <textarea className="textarea" rows={4} value={areaForm.notes} onChange={(e) => setAreaForm({ ...areaForm, notes: e.target.value })} />
          </Field>
          <Button type="submit" disabled={saving}>{areaEditId ? 'Save area' : 'Create area'}</Button>
        </form>
      </SlideOver>

      <SlideOver
        open={drawer === 'asset'}
        title={assetEditId ? 'Edit asset' : 'Add asset'}
        description={selectedHome ? `Track a system or appliance for ${selectedHome.name}.` : 'Track a system or appliance.'}
        onClose={closeDrawer}
      >
        <form className="stacked-form" onSubmit={submitAsset}>
          <Field label="Asset name">
            <input className="input" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} required />
          </Field>
          <Field label="Category">
            <input className="input" value={assetForm.category} onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })} required />
          </Field>
          <div className="two-col">
            <Field label="Manufacturer">
              <input className="input" value={assetForm.manufacturer} onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })} />
            </Field>
            <Field label="Model">
              <input className="input" value={assetForm.model} onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })} />
            </Field>
          </div>
          <div className="two-col">
            <Field label="Serial number">
              <input className="input" value={assetForm.serial_number} onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })} />
            </Field>
            <Field label="Expected lifespan (years)">
              <input className="input" type="number" value={assetForm.expected_lifespan} onChange={(e) => setAssetForm({ ...assetForm, expected_lifespan: e.target.value })} />
            </Field>
          </div>
          <div className="two-col">
            <Field label="Purchase date">
              <input className="input" type="date" value={assetForm.purchase_date} onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })} />
            </Field>
            <Field label="Installation date">
              <input className="input" type="date" value={assetForm.installation_date} onChange={(e) => setAssetForm({ ...assetForm, installation_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Area">
            <select className="input" value={assetForm.area_id} onChange={(e) => setAssetForm({ ...assetForm, area_id: e.target.value })}>
              <option value="">Unassigned</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea className="textarea" rows={4} value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
          </Field>
          <Button type="submit" disabled={saving}>{assetEditId ? 'Save asset' : 'Create asset'}</Button>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === 'home'
            ? 'Delete home?'
            : deleteTarget?.kind === 'area'
              ? 'Delete area?'
              : 'Delete asset?'
        }
        description={
          deleteTarget?.kind === 'home' ? (
            <>
              <p>
                This will remove <strong>{deleteTarget.item.name}</strong> along with its areas and assets.
              </p>
              <p>The action cannot be undone.</p>
            </>
          ) : deleteTarget?.kind === 'area' ? (
            <>
              <p>
                This will remove <strong>{deleteTarget.item.name}</strong> from the selected home.
              </p>
              <p>Assets in that area will become unassigned.</p>
            </>
          ) : deleteTarget?.kind === 'asset' ? (
            <>
              <p>
                This will remove <strong>{deleteTarget.item.name}</strong> from the selected home.
              </p>
              <p>The asset can be re-created later if needed.</p>
            </>
          ) : null
        }
        confirmLabel={
          deleteTarget?.kind === 'home' ? 'Delete home' : deleteTarget?.kind === 'area' ? 'Delete area' : 'Delete asset'
        }
        destructive
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleting(true);
          const run = async () => {
            try {
              if (deleteTarget.kind === 'home') {
                await handleDeleteHome(deleteTarget.item);
              } else if (deleteTarget.kind === 'area') {
                await handleDeleteArea(deleteTarget.item);
              } else {
                await handleDeleteAsset(deleteTarget.item);
              }
            } finally {
              setDeleting(false);
              setDeleteTarget(null);
            }
          };
          void run();
        }}
      />
    </div>
  );
}
