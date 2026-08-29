import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Field, Panel } from '../components/UI';
import { PageHeader } from '../components/PageHeader';
import { SlideOver } from '../components/SlideOver';
import { useAuth } from '../context/AuthContext';
import { apiRequestWithRefresh } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/format';
import { parseHomeParam } from '../lib/routes';
import type {
  Asset,
  Home,
  MaintenanceSchedule,
  MaintenanceScheduleCompleteResponse,
  ScheduleFrequency,
} from '../lib/types';

const SCHEDULE_FREQUENCIES: { label: string; value: ScheduleFrequency; note: string }[] = [
  { label: 'One-time', value: 'one_time', note: 'A single future task.' },
  { label: 'Daily', value: 'daily', note: 'Repeats every day.' },
  { label: 'Weekly', value: 'weekly', note: 'Repeats every 7 days.' },
  { label: 'Monthly', value: 'monthly', note: 'Repeats each month.' },
  { label: 'Quarterly', value: 'quarterly', note: 'Repeats every 3 months.' },
  { label: 'Yearly', value: 'yearly', note: 'Repeats every 12 months.' },
];

type ScheduleForm = {
  title: string;
  description: string;
  frequency: ScheduleFrequency;
  next_due_date: string;
  reminder_enabled: boolean;
  asset_id: string;
};

const emptyForm: ScheduleForm = {
  title: '',
  description: '',
  frequency: 'quarterly',
  next_due_date: '',
  reminder_enabled: true,
  asset_id: '',
};

function normalizeScheduleDate(date: string | null | undefined) {
  if (!date) return null;

  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function SchedulesPage() {
  const { accessToken, refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const [homes, setHomes] = useState<Home[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assetFilter, setAssetFilter] = useState<'all' | string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedHomeId = parseHomeParam(params.get('home'));
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
      const [assetsData, schedulesData] = await Promise.all([
        apiRequestWithRefresh<Asset[]>(
          `/homes/${homeId}/assets`,
          {},
          () => accessToken,
          refreshSession,
        ),
        apiRequestWithRefresh<MaintenanceSchedule[]>(
          filter === 'all'
            ? `/homes/${homeId}/schedules`
            : `/homes/${homeId}/schedules?asset_id=${filter}`,
          {},
          () => accessToken,
          refreshSession,
        ),
      ]);
      setAssets(assetsData);
      setSchedules(schedulesData);
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
      setSchedules([]);
      return;
    }

    loadDetails(selectedHome.id, assetFilter).catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not load schedules.'),
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

  function startEdit(schedule: MaintenanceSchedule) {
    setEditingId(schedule.id);
    setForm({
      title: schedule.title,
      description: schedule.description ?? '',
      frequency: schedule.frequency,
      next_due_date: schedule.next_due_date ?? '',
      reminder_enabled: schedule.reminder_enabled,
      asset_id: schedule.asset_id?.toString() ?? '',
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
      frequency: form.frequency,
      next_due_date: form.next_due_date || null,
      reminder_enabled: form.reminder_enabled,
      asset_id: form.asset_id.trim() ? Number(form.asset_id) : null,
    };

    try {
      if (editingId) {
        await apiRequestWithRefresh<MaintenanceSchedule>(
          `/homes/${selectedHome.id}/schedules/${editingId}`,
          { method: 'PATCH', body },
          () => accessToken,
          refreshSession,
        );
      } else {
        await apiRequestWithRefresh<MaintenanceSchedule>(
          `/homes/${selectedHome.id}/schedules`,
          { method: 'POST', body },
          () => accessToken,
          refreshSession,
        );
      }
      await loadDetails(selectedHome.id, assetFilter);
      resetForm();
      closeDrawer();
      setStatus(editingId ? 'Schedule updated.' : 'Schedule created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save schedule.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(schedule: MaintenanceSchedule) {
    if (!selectedHome) return;
    if (!window.confirm(`Delete ${schedule.title}?`)) return;
    try {
      await apiRequestWithRefresh<void>(
        `/homes/${selectedHome.id}/schedules/${schedule.id}`,
        { method: 'DELETE' },
        () => accessToken,
        refreshSession,
      );
      await loadDetails(selectedHome.id, assetFilter);
      setStatus('Schedule deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete schedule.');
    }
  }

  async function complete(schedule: MaintenanceSchedule) {
    if (!selectedHome) return;
    setError('');
    setStatus('');

    try {
      const result = await apiRequestWithRefresh<MaintenanceScheduleCompleteResponse>(
        `/homes/${selectedHome.id}/schedules/${schedule.id}/complete`,
        { method: 'POST' },
        () => accessToken,
        refreshSession,
      );

      await loadDetails(selectedHome.id, assetFilter);
      closeDrawer();
      setStatus(
        `${result.message}${result.maintenance_record ? ' A maintenance history entry was created.' : ''}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete schedule.');
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const dueSoonCutoff = new Date();
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 30);
  const dueSoonIso = dueSoonCutoff.toISOString().slice(0, 10);

  const recurringCount = schedules.filter((schedule) => schedule.frequency !== 'one_time').length;
  const reminderCount = schedules.filter((schedule) => schedule.reminder_enabled).length;
  const dueSoonCount = schedules.filter((schedule) => {
    if (!schedule.next_due_date) return false;
    return schedule.next_due_date >= todayIso && schedule.next_due_date <= dueSoonIso;
  }).length;
  const overdueCount = schedules.filter((schedule) => {
    if (!schedule.next_due_date) return false;
    return schedule.next_due_date < todayIso;
  }).length;

  return (
    <div className="homes-page">
      <PageHeader
        eyebrow="Hupkeep"
        title="Schedules"
        description="See upcoming work, recurring tasks, and what has already been handled."
        actions={<Button onClick={openCreateForm}>+ Add schedule</Button>}
        filters={
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
      />

      <div className="overview-row schedule-overview">
        <div className="stat-card">
          <span>Schedules</span>
          <strong>{schedules.length}</strong>
        </div>
        <div className="stat-card">
          <span>Recurring</span>
          <strong>{recurringCount}</strong>
        </div>
        <div className="stat-card">
          <span>Due soon</span>
          <strong>{dueSoonCount}</strong>
        </div>
        <div className="stat-card">
          <span>Overdue</span>
          <strong>{overdueCount}</strong>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}
      {status ? <div className="success-banner">{status}</div> : null}

      <div className="workspace-grid management-grid">
        <aside className="workspace-sidebar">
          <Panel title="Homes" eyebrow="Choose a home">
            {loading ? (
              <div className="loading-state compact">
                <div className="spinner" />
                <p>Loading homes...</p>
              </div>
            ) : homes.length === 0 ? (
              <EmptyState
                title="No homes yet"
                description="Create a home first, then add repeating work to keep it maintained."
              />
            ) : (
              <div className="home-grid">
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
                title={`${selectedHome.name} schedules`}
                eyebrow="Selected home"
                actions={
                  <div className="panel-actions">
                    <div className="meta-pill">{selectedAssetLabel}</div>
                    <Button onClick={openCreateForm}>+ Add schedule</Button>
                  </div>
                }
              >
                <div className="home-detail">
                  <div>
                    <p className="detail-label">Assets available</p>
                    <strong>{assets.length}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Reminders enabled</p>
                    <strong>{reminderCount}</strong>
                  </div>
                  <div>
                    <p className="detail-label">Active filter</p>
                    <strong>{assetFilter === 'all' ? 'All assets' : assets.find((asset) => String(asset.id) === assetFilter)?.name ?? 'Selected asset'}</strong>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Schedules"
                eyebrow="Calendar"
              >
                {detailLoading ? (
                  <div className="loading-state compact">
                    <div className="spinner" />
                    <p>Loading schedules...</p>
                  </div>
                ) : schedules.length === 0 ? (
                  <EmptyState
                    title="No schedules yet"
                    description="Add a repeating task for the selected home to keep routine work visible."
                    action={<Button onClick={openCreateForm}>Add schedule</Button>}
                  />
                ) : (
                  <div className="schedule-list">
                    {schedules.map((schedule) => {
                      const nextDue = normalizeScheduleDate(schedule.next_due_date);
                      const lastCompleted = normalizeScheduleDate(schedule.last_completed);
                      const isOverdue = schedule.next_due_date ? schedule.next_due_date < todayIso : false;
                      const isDueSoon =
                        schedule.next_due_date ? schedule.next_due_date >= todayIso && schedule.next_due_date <= dueSoonIso : false;

                      return (
                        <article className="schedule-card" key={schedule.id}>
                          <div className="schedule-card-main">
                            <div className="schedule-card-head">
                              <div>
                                <strong>{schedule.title}</strong>
                                <p>{schedule.frequency.replace('_', ' ')}{schedule.asset_id ? ` · ${assets.find((asset) => asset.id === schedule.asset_id)?.name ?? 'Asset'}` : ''}</p>
                              </div>
                              <div className="schedule-tags">
                                <span className={`schedule-tag ${schedule.reminder_enabled ? 'active' : 'muted'}`}>
                                  {schedule.reminder_enabled ? 'Reminder on' : 'Reminder off'}
                                </span>
                                {isOverdue ? <span className="schedule-tag overdue">Overdue</span> : null}
                                {!isOverdue && isDueSoon ? <span className="schedule-tag soon">Due soon</span> : null}
                                {!isOverdue && !isDueSoon && schedule.next_due_date ? (
                                  <span className="schedule-tag">On track</span>
                                ) : null}
                              </div>
                            </div>

                            {schedule.description ? <p className="muted-copy">{schedule.description}</p> : null}

                            <div className="schedule-meta">
                              <div>
                                <span className="detail-label">Next due</span>
                                <strong>{formatDate(schedule.next_due_date)}</strong>
                              </div>
                              <div>
                                <span className="detail-label">Last completed</span>
                                <strong>{lastCompleted ? formatDateTime(lastCompleted) : 'Never'}</strong>
                              </div>
                              <div>
                                <span className="detail-label">Status</span>
                                <strong>{schedule.reminder_enabled ? 'Tracking reminders' : 'Quiet mode'}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="item-actions schedule-actions">
                            <Button variant="accent" onClick={() => void complete(schedule)}>
                              Mark complete
                            </Button>
                            <Button variant="ghost" onClick={() => startEdit(schedule)}>
                              Edit
                            </Button>
                            <Button variant="ghost" onClick={() => void remove(schedule)}>
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
              description="Choose a home to start managing recurring maintenance work."
              action={<Button onClick={openCreateForm}>Add schedule</Button>}
            />
          )}
        </section>
      </div>

      <SlideOver
        open={drawerOpen}
        title={editingId ? 'Edit schedule' : 'Add schedule'}
        description="Set the next due date and the reminder cadence."
        onClose={closeDrawer}
      >
        <form className="stacked-form" onSubmit={submit}>
          <Field label="Title">
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              className="textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Frequency">
            <select
              className="input"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value as ScheduleFrequency })}
            >
              {SCHEDULE_FREQUENCIES.map((frequency) => (
                <option key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </option>
              ))}
            </select>
            <span className="field-hint">{SCHEDULE_FREQUENCIES.find((frequency) => frequency.value === form.frequency)?.note}</span>
          </Field>
          <div className="two-col">
            <Field label="Next due date">
              <input
                className="input"
                type="date"
                value={form.next_due_date}
                onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
              />
            </Field>
            <Field label="Reminder">
              <select
                className="input"
                value={form.reminder_enabled ? 'true' : 'false'}
                onChange={(e) => setForm({ ...form, reminder_enabled: e.target.value === 'true' })}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </Field>
          </div>
          <Field label="Asset">
            <select
              className="input"
              value={form.asset_id}
              onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={saving}>
            {editingId ? 'Save schedule' : 'Create schedule'}
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
