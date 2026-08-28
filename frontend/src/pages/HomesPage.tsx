import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Field, Panel, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { parseHomeParam } from '../lib/routes';
import type { Area, Asset, Home } from '../lib/types';
import { formatDate } from '../lib/format';

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
      setActionMessage(assetEditId ? 'Asset updated.' : 'Asset created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the asset.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHome(home: Home) {
    if (!window.confirm(`Delete ${home.name}? This will remove its areas and assets.`)) return;
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
    if (!window.confirm(`Delete ${area.name}? Assets in that area will become unassigned.`)) return;
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
    if (!window.confirm(`Delete ${asset.name}?`)) return;
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
  }

  function startAreaEdit(area: Area) {
    setAreaEditId(area.id);
    setAreaForm({
      name: area.name,
      notes: area.notes ?? '',
    });
    setActionMessage('');
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
  }

  const stats = [
    { label: 'Homes', value: homes.length.toString() },
    { label: 'Areas', value: areas.length.toString() },
    { label: 'Assets', value: assets.length.toString() },
  ];

  return (
    <div className="homes-page">
      <div className="overview-row">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      {error ? <div className="form-error">{error}</div> : null}
      {actionMessage ? <div className="success-banner">{actionMessage}</div> : null}

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <Panel
            title={homeEditId ? 'Edit home' : 'Add a home'}
            eyebrow="Home library"
            actions={homeEditId ? <Button variant="ghost" onClick={resetHomeForm}>Cancel</Button> : null}
          >
            <form className="stacked-form" onSubmit={submitHome}>
              <Field label="Home name">
                <input className="input" value={homeForm.name} onChange={(e) => setHomeForm({ ...homeForm, name: e.target.value })} required />
              </Field>
              <Field label="Address">
                <textarea className="textarea" rows={3} value={homeForm.address} onChange={(e) => setHomeForm({ ...homeForm, address: e.target.value })} required />
              </Field>
              <Field label="Property type">
                <input className="input" value={homeForm.property_type} onChange={(e) => setHomeForm({ ...homeForm, property_type: e.target.value })} required />
              </Field>
              <Field label="Year built">
                <input className="input" type="number" value={homeForm.year_built} onChange={(e) => setHomeForm({ ...homeForm, year_built: e.target.value })} required />
              </Field>
              <Button type="submit" disabled={saving}>{homeEditId ? 'Save home' : 'Create home'}</Button>
            </form>
          </Panel>

          <Panel title="Your homes" eyebrow="Select a place">
            {loading ? (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading homes...</p>
              </div>
            ) : homes.length === 0 ? (
              <EmptyState
                title="No homes yet"
                description="Add your first home to start tracking rooms, repairs, and upkeep."
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
                      <div className="home-actions">
                        <button type="button" onClick={() => startHomeEdit(home)}>Edit</button>
                        <button type="button" onClick={() => void handleDeleteHome(home)}>Delete</button>
                      </div>
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
                title={selectedHome.name}
                eyebrow="Selected home"
                actions={<div className="meta-pill">{selectedHome.property_type} · Built {selectedHome.year_built}</div>}
              >
                <div className="home-detail">
                  <div>
                    <p className="detail-label">Address</p>
                    <strong>{selectedHome.address}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Created</p>
                    <strong>{formatDate(selectedHome.created_at)}</strong>
                  </div>
                </div>
              </Panel>

              <div className="split-panels">
                <Panel
                  title={areaEditId ? 'Edit area' : 'Add an area'}
                  eyebrow="Home zones"
                  actions={areaEditId ? <Button variant="ghost" onClick={resetAreaForm}>Cancel</Button> : null}
                >
                  <form className="stacked-form" onSubmit={submitArea}>
                    <Field label="Area name">
                      <input className="input" value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} required />
                    </Field>
                    <Field label="Notes">
                      <textarea className="textarea" rows={3} value={areaForm.notes} onChange={(e) => setAreaForm({ ...areaForm, notes: e.target.value })} />
                    </Field>
                    <Button type="submit" disabled={saving}>{areaEditId ? 'Save area' : 'Create area'}</Button>
                  </form>

                  <div className="item-list">
                    {areas.length === 0 ? (
                      <p className="muted-copy">No areas yet. Add rooms or zones to keep the home organized.</p>
                    ) : areas.map((area) => (
                      <article className="item-card" key={area.id}>
                        <div>
                          <strong>{area.name}</strong>
                          {area.notes ? <p>{area.notes}</p> : <p className="muted-copy">No notes yet.</p>}
                        </div>
                        <div className="item-actions">
                          <button type="button" onClick={() => startAreaEdit(area)}>Edit</button>
                          <button type="button" onClick={() => void handleDeleteArea(area)}>Delete</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title={assetEditId ? 'Edit asset' : 'Add an asset'}
                  eyebrow="Maintainable things"
                  actions={assetEditId ? <Button variant="ghost" onClick={resetAssetForm}>Cancel</Button> : null}
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
                      <textarea className="textarea" rows={3} value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
                    </Field>
                    <Button type="submit" disabled={saving}>{assetEditId ? 'Save asset' : 'Create asset'}</Button>
                  </form>

                  <div className="asset-toolbar">
                    <label>
                      <span className="field-label">Filter by area</span>
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
                  </div>

                  <div className="item-list">
                    {detailLoading ? (
                      <div className="loading-state compact">
                        <div className="spinner" />
                        <p>Loading assets...</p>
                      </div>
                    ) : assets.length === 0 ? (
                      <p className="muted-copy">No assets yet. Add appliances, systems, or tools tied to this home.</p>
                    ) : assets.map((asset) => (
                      <article className="item-card" key={asset.id}>
                        <div>
                          <strong>{asset.name}</strong>
                          <p>{asset.category}{asset.area_id ? ` · Area ${asset.area_id}` : ''}</p>
                          <p className="muted-copy">{asset.manufacturer || 'No manufacturer'} · {asset.model || 'No model'}</p>
                        </div>
                        <div className="item-actions">
                          <button type="button" onClick={() => startAssetEdit(asset)}>Edit</button>
                          <button type="button" onClick={() => void handleDeleteAsset(asset)}>Delete</button>
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
            />
          )}
        </section>
      </div>
    </div>
  );
}
