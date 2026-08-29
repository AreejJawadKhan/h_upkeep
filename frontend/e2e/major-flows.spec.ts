import { expect, test } from '@playwright/test';
import type {
  Area,
  Asset,
  DashboardOverviewResponse,
  Home,
  HomeDocument,
  MaintenanceCategory,
  MaintenanceRecord,
  MaintenanceSchedule,
  MaintenanceScheduleCompleteResponse,
  SpendingOverviewResponse,
  User,
  Warranty,
} from '../src/lib/types';

type AppState = {
  currentUser: User | null;
  sessionToken: string | null;
  googleToken: string;
  homes: Home[];
  areas: Area[];
  assets: Asset[];
  maintenance: MaintenanceRecord[];
  schedules: MaintenanceSchedule[];
  documents: HomeDocument[];
  warranties: Warranty[];
  nextIds: {
    home: number;
    area: number;
    asset: number;
    maintenance: number;
    schedule: number;
    document: number;
    warranty: number;
  };
  failSpendingOnce: boolean;
  slowSpendingDelayMs: number;
};

const BASE_USER: User = {
  id: 1,
  name: 'Areej Khan',
  email: 'owner@example.com',
  email_verified: true,
  created_at: '2026-08-28',
};

function createState(): AppState {
  return {
    currentUser: null,
    sessionToken: null,
    googleToken: 'google-access-token',
    homes: [],
    areas: [],
    assets: [],
    maintenance: [],
    schedules: [],
    documents: [],
    warranties: [],
    nextIds: {
      home: 1,
      area: 1,
      asset: 1,
      maintenance: 1,
      schedule: 1,
      document: 1,
      warranty: 1,
    },
    failSpendingOnce: false,
    slowSpendingDelayMs: 0,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthlyLabel(dateString: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(`${dateString}T00:00:00Z`));
}

function createHomeRecord(state: AppState, input: { name: string; address: string; property_type: string; year_built: number }) {
  const home: Home = {
    id: state.nextIds.home++,
    user_id: 1,
    name: input.name,
    address: input.address,
    property_type: input.property_type,
    year_built: input.year_built,
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  };
  state.homes.unshift(home);
  return home;
}

function createAreaRecord(state: AppState, homeId: number, input: { name: string; notes?: string | null }) {
  const area: Area = {
    id: state.nextIds.area++,
    home_id: homeId,
    name: input.name,
    notes: input.notes ?? null,
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  };
  state.areas.unshift(area);
  return area;
}

function createAssetRecord(
  state: AppState,
  homeId: number,
  input: {
    name: string;
    category: string;
    manufacturer?: string | null;
    model?: string | null;
    serial_number?: string | null;
    purchase_date?: string | null;
    installation_date?: string | null;
    expected_lifespan?: number | null;
    notes?: string | null;
    area_id?: number | null;
  },
) {
  const asset: Asset = {
    id: state.nextIds.asset++,
    home_id: homeId,
    area_id: input.area_id ?? null,
    name: input.name,
    category: input.category,
    manufacturer: input.manufacturer ?? null,
    model: input.model ?? null,
    serial_number: input.serial_number ?? null,
    purchase_date: input.purchase_date ?? null,
    installation_date: input.installation_date ?? null,
    expected_lifespan: input.expected_lifespan ?? null,
    notes: input.notes ?? null,
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  };
  state.assets.unshift(asset);
  return asset;
}

function createMaintenanceRecord(
  state: AppState,
  homeId: number,
  input: {
    title: string;
    description?: string | null;
    item: string;
    category: MaintenanceCategory;
    date: string;
    cost: number;
    service_provider?: string | null;
    next_due_date?: string | null;
    image_url?: string | null;
    asset_id?: number | null;
  },
) {
  const record: MaintenanceRecord = {
    id: state.nextIds.maintenance++,
    user_id: 1,
    home_id: homeId,
    asset_id: input.asset_id ?? null,
    title: input.title,
    description: input.description ?? null,
    item: input.item,
    category: input.category,
    date: input.date,
    cost: input.cost,
    service_provider: input.service_provider ?? null,
    next_due_date: input.next_due_date ?? null,
    image_url: input.image_url ?? null,
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  };
  state.maintenance.unshift(record);
  return record;
}

function createScheduleRecord(
  state: AppState,
  homeId: number,
  input: {
    title: string;
    description?: string | null;
    frequency: MaintenanceSchedule['frequency'];
    next_due_date?: string | null;
    reminder_enabled: boolean;
    asset_id?: number | null;
  },
) {
  const schedule: MaintenanceSchedule = {
    id: state.nextIds.schedule++,
    user_id: 1,
    home_id: homeId,
    asset_id: input.asset_id ?? null,
    title: input.title,
    description: input.description ?? null,
    frequency: input.frequency,
    next_due_date: input.next_due_date ?? null,
    last_completed: null,
    reminder_enabled: input.reminder_enabled,
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  };
  state.schedules.unshift(schedule);
  return schedule;
}

function createDocumentRecord(
  state: AppState,
  homeId: number,
  maintenanceId: number,
  input: { file_name: string; file_type: string },
) {
  const document: HomeDocument = {
    id: state.nextIds.document++,
    maintenance_id: maintenanceId,
    maintenance_title:
      state.maintenance.find((record) => record.id === maintenanceId)?.title ?? 'Maintenance record',
    file_name: input.file_name,
    file_type: input.file_type,
    cloudinary_url: `https://example.com/${input.file_name}`,
    created_at: '2026-08-28T10:00:00Z',
  };
  state.documents.unshift(document);
  return document;
}

function createWarrantyRecord(
  state: AppState,
  homeId: number,
  input: {
    provider: string;
    coverage_details?: string | null;
    start_date: string;
    expiration_date: string;
    asset_id: number;
    document_id?: number | null;
  },
) {
  const warranty: Warranty = {
    id: state.nextIds.warranty++,
    user_id: 1,
    home_id: homeId,
    asset_id: input.asset_id,
    document_id: input.document_id ?? null,
    provider: input.provider,
    coverage_details: input.coverage_details ?? null,
    start_date: input.start_date,
    expiration_date: input.expiration_date,
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  };
  state.warranties.unshift(warranty);
  return warranty;
}

function toSpendingOverview(state: AppState, homeId?: number): SpendingOverviewResponse {
  const records = homeId ? state.maintenance.filter((record) => record.home_id === homeId) : state.maintenance;
  const totalSpend = records.reduce((sum, record) => sum + record.cost, 0);
  const byMonth = new Map<string, { total: number; count: number }>();
  const byCategory = new Map<string, { total: number; count: number }>();
  const byAsset = new Map<number | null, { asset_name: string; total: number; count: number }>();

  for (const record of records) {
    const month = monthlyLabel(record.date);
    const monthEntry = byMonth.get(month) ?? { total: 0, count: 0 };
    monthEntry.total += record.cost;
    monthEntry.count += 1;
    byMonth.set(month, monthEntry);

    const categoryEntry = byCategory.get(record.category) ?? { total: 0, count: 0 };
    categoryEntry.total += record.cost;
    categoryEntry.count += 1;
    byCategory.set(record.category, categoryEntry);

    const asset = state.assets.find((item) => item.id === record.asset_id);
    const assetKey = record.asset_id ?? null;
    const assetEntry = byAsset.get(assetKey) ?? { asset_name: asset?.name ?? 'Unassigned', total: 0, count: 0 };
    assetEntry.total += record.cost;
    assetEntry.count += 1;
    byAsset.set(assetKey, assetEntry);
  }

  const monthlyTrend = Array.from(byMonth.entries()).map(([label, entry]) => ({
    label,
    total_spend: entry.total,
    record_count: entry.count,
  }));

  const categoryBreakdown = Array.from(byCategory.entries()).map(([category, entry]) => ({
    category,
    total_spend: entry.total,
    record_count: entry.count,
  }));

  const assetBreakdown = Array.from(byAsset.entries()).map(([assetId, entry]) => ({
    asset_id: assetId,
    asset_name: entry.asset_name,
    total_spend: entry.total,
    record_count: entry.count,
  }));

  const recentRecords = [...records]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((record) => {
      const asset = state.assets.find((item) => item.id === record.asset_id);
      const home = state.homes.find((item) => item.id === record.home_id);
      return {
        id: record.id,
        title: record.title,
        date: record.date,
        category: record.category,
        cost: record.cost,
        service_provider: record.service_provider,
        home_id: record.home_id,
        home_name: home?.name ?? 'Home',
        asset_id: record.asset_id,
        asset_name: asset?.name ?? null,
        created_at: record.created_at,
      };
    });

  return {
    scope_home_id: homeId ?? null,
    scope_home_name: homeId ? state.homes.find((item) => item.id === homeId)?.name ?? null : null,
    total_spend: totalSpend,
    this_month_spend: totalSpend,
    this_year_spend: totalSpend,
    previous_year_spend: 0,
    average_cost: records.length > 0 ? totalSpend / records.length : 0,
    record_count: records.length,
    monthly_trend: monthlyTrend,
    category_breakdown: categoryBreakdown,
    asset_breakdown: assetBreakdown,
    recent_records: recentRecords,
  };
}

function toDashboard(state: AppState, homeId?: number): DashboardOverviewResponse {
  const homes = homeId ? state.homes.filter((home) => home.id === homeId) : state.homes;
  const maintenance = homeId ? state.maintenance.filter((item) => item.home_id === homeId) : state.maintenance;
  const schedules = homeId ? state.schedules.filter((item) => item.home_id === homeId) : state.schedules;
  const warranties = homeId ? state.warranties.filter((item) => item.home_id === homeId) : state.warranties;

  const today = todayIso();
  const dueSoonCutoff = new Date();
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 30);
  const dueSoonIso = dueSoonCutoff.toISOString().slice(0, 10);

  const upcomingMaintenance = [
    ...maintenance
      .filter((item) => item.next_due_date)
      .map((item) => ({
        kind: 'maintenance' as const,
        title: item.title,
        description: item.description ?? item.item,
        due_date: item.next_due_date,
        home_id: item.home_id,
        home_name: state.homes.find((home) => home.id === item.home_id)?.name ?? 'Home',
        asset_id: item.asset_id,
        asset_name: state.assets.find((asset) => asset.id === item.asset_id)?.name ?? null,
        status: item.next_due_date && item.next_due_date < today ? 'overdue' : 'due_soon',
        source_id: item.id,
      })),
    ...schedules
      .filter((item) => item.next_due_date)
      .map((item) => ({
        kind: 'schedule' as const,
        title: item.title,
        description: item.description ?? item.frequency.replace('_', ' '),
        due_date: item.next_due_date,
        home_id: item.home_id,
        home_name: state.homes.find((home) => home.id === item.home_id)?.name ?? 'Home',
        asset_id: item.asset_id,
        asset_name: state.assets.find((asset) => asset.id === item.asset_id)?.name ?? null,
        status: item.next_due_date && item.next_due_date < today ? 'overdue' : 'due_soon',
        source_id: item.id,
      })),
  ]
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 3);

  const warrantyAlerts = warranties
    .filter((item) => item.expiration_date <= dueSoonIso)
    .map((item) => ({
      status: item.expiration_date < today ? ('expired' as const) : ('expiring_soon' as const),
      provider: item.provider,
      asset_name: state.assets.find((asset) => asset.id === item.asset_id)?.name ?? 'Asset',
      home_id: item.home_id,
      home_name: state.homes.find((home) => home.id === item.home_id)?.name ?? 'Home',
      expiration_date: item.expiration_date,
      source_id: item.id,
      document_id: item.document_id,
    }));

  const recentActivity = [
    ...maintenance.slice(0, 1).map((item) => ({
      kind: 'maintenance' as const,
      title: item.title,
      description: item.description ?? item.item,
      timestamp: item.created_at,
      home_id: item.home_id,
      home_name: state.homes.find((home) => home.id === item.home_id)?.name ?? 'Home',
      asset_id: item.asset_id,
      asset_name: state.assets.find((asset) => asset.id === item.asset_id)?.name ?? null,
      source_id: item.id,
    })),
    ...state.documents.slice(0, 1).map((item) => {
      const record = state.maintenance.find((maintenanceRecord) => maintenanceRecord.id === item.maintenance_id);
      return {
        kind: 'document' as const,
        title: `Uploaded ${item.file_name}`,
        description: `Attached to ${item.maintenance_title}`,
        timestamp: item.created_at,
        home_id: record?.home_id ?? 1,
        home_name: state.homes.find((home) => home.id === record?.home_id)?.name ?? 'Home',
        asset_id: record?.asset_id ?? null,
        asset_name: state.assets.find((asset) => asset.id === record?.asset_id)?.name ?? null,
        source_id: item.id,
      };
    }),
  ].slice(0, 3);

  const homeHealth = homes.map((home) => {
    const homeMaintenance = state.maintenance.filter((item) => item.home_id === home.id);
    const homeSchedules = state.schedules.filter((item) => item.home_id === home.id);
    const homeWarranties = state.warranties.filter((item) => item.home_id === home.id);
    const dueSoonCount = homeMaintenance.filter((item) => item.next_due_date && item.next_due_date >= today && item.next_due_date <= dueSoonIso).length +
      homeSchedules.filter((item) => item.next_due_date && item.next_due_date >= today && item.next_due_date <= dueSoonIso).length;
    const overdueCount = homeMaintenance.filter((item) => item.next_due_date && item.next_due_date < today).length +
      homeSchedules.filter((item) => item.next_due_date && item.next_due_date < today).length;
    const expiringSoonCount = homeWarranties.filter((item) => item.expiration_date >= today && item.expiration_date <= dueSoonIso).length;
    const expiredCount = homeWarranties.filter((item) => item.expiration_date < today).length;
    const statusLabel = overdueCount > 0 || expiredCount > 0 ? 'Attention' : dueSoonCount > 0 || expiringSoonCount > 0 ? 'Watch' : 'Healthy';
    const summary = overdueCount > 0
      ? `${overdueCount} item${overdueCount === 1 ? '' : 's'} need attention.`
      : dueSoonCount > 0
        ? `${dueSoonCount} item${dueSoonCount === 1 ? '' : 's'} are due soon.`
        : 'Everything looks calm.';

    return {
      home_id: home.id,
      home_name: home.name,
      asset_count: state.assets.filter((item) => item.home_id === home.id).length,
      maintenance_record_count: homeMaintenance.length,
      schedule_count: homeSchedules.length,
      warranty_count: homeWarranties.length,
      due_soon_count: dueSoonCount,
      overdue_count: overdueCount,
      expiring_soon_count: expiringSoonCount,
      expired_warranty_count: expiredCount,
      status_label: statusLabel,
      summary,
    };
  });

  return {
    scope_home_id: homeId ?? null,
    scope_home_name: homeId ? state.homes.find((home) => home.id === homeId)?.name ?? null : null,
    home_count: state.homes.length,
    asset_count: state.assets.length,
    maintenance_record_count: maintenance.length,
    schedule_count: schedules.length,
    warranty_count: warranties.length,
    due_soon_count: upcomingMaintenance.filter((item) => item.status === 'due_soon').length,
    overdue_count: upcomingMaintenance.filter((item) => item.status === 'overdue').length,
    expiring_soon_count: warrantyAlerts.filter((item) => item.status === 'expiring_soon').length,
    expired_warranty_count: warrantyAlerts.filter((item) => item.status === 'expired').length,
    total_spend: toSpendingOverview(state, homeId).total_spend,
    this_month_spend: toSpendingOverview(state, homeId).this_month_spend,
    this_year_spend: toSpendingOverview(state, homeId).this_year_spend,
    average_cost: toSpendingOverview(state, homeId).average_cost,
    upcoming_maintenance: upcomingMaintenance,
    warranty_alerts: warrantyAlerts,
    recent_activity: recentActivity,
    home_health: homeHealth,
    spending: toSpendingOverview(state, homeId),
  };
}

async function installApiMock(page, state: AppState) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.port !== '8000') {
      await route.continue();
      return;
    }

    const { pathname } = url;
    const method = route.request().method();
    const headers = route.request().headers();
    const body = route.request().postDataJSON?.() ?? {};

    if (pathname === '/auth/refresh' && method === 'POST') {
      if (!state.sessionToken) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'No session' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: state.sessionToken, token_type: 'bearer' }),
      });
      return;
    }

    if (pathname === '/auth/me' && method === 'GET') {
      const auth = headers.authorization ?? '';
      const validTokens = [state.sessionToken, state.googleToken].filter(Boolean).map((token) => `Bearer ${token}`);
      if (state.currentUser && validTokens.includes(auth)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(state.currentUser),
        });
        return;
      }
      if (auth === `Bearer ${state.googleToken}`) {
        state.currentUser = BASE_USER;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(state.currentUser),
        });
        return;
      }
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Unauthorized' }) });
      return;
    }

    if (pathname === '/auth/login' && method === 'POST') {
      state.currentUser = BASE_USER;
      state.sessionToken = 'session-access-token';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: state.sessionToken, token_type: 'bearer', user: state.currentUser }),
      });
      return;
    }

    if (pathname === '/auth/register' && method === 'POST') {
      state.currentUser = null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          name: body.name,
          email: body.email,
          email_verified: false,
          created_at: '2026-08-28',
        }),
      });
      return;
    }

    if (pathname === '/auth/logout' && method === 'POST') {
      state.sessionToken = null;
      state.currentUser = null;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Signed out' }) });
      return;
    }

    if (pathname === '/auth/verify-email' && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Email verified.' }) });
      return;
    }

    if (pathname === '/auth/resend-verification' && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Verification email sent.' }) });
      return;
    }

    if (pathname === '/auth/password-reset/request' && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Reset email sent.' }) });
      return;
    }

    if (pathname === '/auth/password-reset/confirm' && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Password updated.' }) });
      return;
    }

    if (pathname === '/homes' && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.homes) });
      return;
    }

    if (pathname === '/homes' && method === 'POST') {
      const home = createHomeRecord(state, body);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(home) });
      return;
    }

    const homeMatch = pathname.match(/^\/homes\/(\d+)(?:\/(.*))?$/);
    if (homeMatch) {
      const homeId = Number(homeMatch[1]);
      const remainder = homeMatch[2] ?? '';
      const homeExists = state.homes.some((home) => home.id === homeId);

      if (!homeExists && remainder !== '') {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Home not found' }) });
        return;
      }

      if (remainder === '' && method === 'PATCH') {
        const home = state.homes.find((item) => item.id === homeId);
        if (!home) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Home not found' }) });
          return;
        }
        Object.assign(home, body, { updated_at: '2026-08-28T10:00:00Z' });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(home) });
        return;
      }

      if (remainder === '' && method === 'DELETE') {
        state.homes = state.homes.filter((item) => item.id !== homeId);
        state.areas = state.areas.filter((item) => item.home_id !== homeId);
        state.assets = state.assets.filter((item) => item.home_id !== homeId);
        state.maintenance = state.maintenance.filter((item) => item.home_id !== homeId);
        state.schedules = state.schedules.filter((item) => item.home_id !== homeId);
        state.warranties = state.warranties.filter((item) => item.home_id !== homeId);
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      if (remainder === 'areas') {
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(state.areas.filter((item) => item.home_id === homeId)),
          });
          return;
        }
        if (method === 'POST') {
          const area = createAreaRecord(state, homeId, body);
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(area) });
          return;
        }
      }

      const areaMatch = remainder.match(/^areas\/(\d+)$/);
      if (areaMatch) {
        const areaId = Number(areaMatch[1]);
        const area = state.areas.find((item) => item.id === areaId && item.home_id === homeId);
        if (!area) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Area not found' }) });
          return;
        }
        if (method === 'PATCH') {
          Object.assign(area, body, { updated_at: '2026-08-28T10:00:00Z' });
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(area) });
          return;
        }
        if (method === 'DELETE') {
          state.areas = state.areas.filter((item) => item.id !== areaId);
          state.assets = state.assets.map((asset) => (asset.area_id === areaId ? { ...asset, area_id: null } : asset));
          await route.fulfill({ status: 204, body: '' });
          return;
        }
      }

      if (remainder === 'assets') {
        if (method === 'GET') {
          const areaId = url.searchParams.get('area_id');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              state.assets.filter((item) =>
                item.home_id === homeId && (areaId === null || areaId === 'all' || String(item.area_id ?? '') === areaId),
              ),
            ),
          });
          return;
        }
        if (method === 'POST') {
          const asset = createAssetRecord(state, homeId, body);
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(asset) });
          return;
        }
      }

      const assetMatch = remainder.match(/^assets\/(\d+)$/);
      if (assetMatch) {
        const assetId = Number(assetMatch[1]);
        const asset = state.assets.find((item) => item.id === assetId && item.home_id === homeId);
        if (!asset) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Asset not found' }) });
          return;
        }
        if (method === 'PATCH') {
          Object.assign(asset, body, { updated_at: '2026-08-28T10:00:00Z' });
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(asset) });
          return;
        }
        if (method === 'DELETE') {
          state.assets = state.assets.filter((item) => item.id !== assetId);
          await route.fulfill({ status: 204, body: '' });
          return;
        }
      }

      if (remainder === 'maintenance') {
        if (method === 'GET') {
          const assetId = url.searchParams.get('asset_id');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              state.maintenance.filter((item) =>
                item.home_id === homeId && (assetId === null || assetId === 'all' || String(item.asset_id ?? '') === assetId),
              ),
            ),
          });
          return;
        }
        if (method === 'POST') {
          const record = createMaintenanceRecord(state, homeId, body);
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(record) });
          return;
        }
      }

      const maintenanceMatch = remainder.match(/^maintenance\/(\d+)$/);
      if (maintenanceMatch && method === 'PATCH') {
        const recordId = Number(maintenanceMatch[1]);
        const record = state.maintenance.find((item) => item.id === recordId && item.home_id === homeId);
        if (!record) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Maintenance record not found' }) });
          return;
        }
        Object.assign(record, body, { updated_at: '2026-08-28T10:00:00Z' });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) });
        return;
      }
      if (maintenanceMatch && method === 'DELETE') {
        const recordId = Number(maintenanceMatch[1]);
        state.maintenance = state.maintenance.filter((item) => item.id !== recordId);
        state.documents = state.documents.filter((item) => item.maintenance_id !== recordId);
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      const documentsMatch = remainder.match(/^maintenance\/(\d+)\/documents(?:\/(\d+))?$/);
      if (documentsMatch) {
        const maintenanceId = Number(documentsMatch[1]);
        const documentId = documentsMatch[2] ? Number(documentsMatch[2]) : null;
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              state.documents.filter((item) => item.maintenance_id === maintenanceId).map((item) => ({
                ...item,
                cloudinary_url: item.cloudinary_url,
              })),
            ),
          });
          return;
        }
        if (method === 'POST') {
          const document = createDocumentRecord(state, homeId, maintenanceId, {
            file_name: body.file_name,
            file_type: body.file_type,
          });
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(document) });
          return;
        }
        if (method === 'DELETE' && documentId !== null) {
          state.documents = state.documents.filter((item) => item.id !== documentId);
          await route.fulfill({ status: 204, body: '' });
          return;
        }
      }

      if (remainder === 'documents' && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            state.documents
              .filter((document) =>
                state.maintenance.some((record) => record.id === document.maintenance_id && record.home_id === homeId),
              )
              .map((document) => ({
                id: document.id,
                maintenance_id: document.maintenance_id,
                maintenance_title: document.maintenance_title,
                file_name: document.file_name,
                file_type: document.file_type,
                cloudinary_url: document.cloudinary_url,
                created_at: document.created_at,
              })),
          ),
        });
        return;
      }

      if (remainder === 'schedules') {
        if (method === 'GET') {
          const assetId = url.searchParams.get('asset_id');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              state.schedules.filter((item) =>
                item.home_id === homeId && (assetId === null || assetId === 'all' || String(item.asset_id ?? '') === assetId),
              ),
            ),
          });
          return;
        }
        if (method === 'POST') {
          const schedule = createScheduleRecord(state, homeId, body);
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(schedule) });
          return;
        }
      }

      const scheduleMatch = remainder.match(/^schedules\/(\d+)(?:\/(complete))?$/);
      if (scheduleMatch) {
        const scheduleId = Number(scheduleMatch[1]);
        const action = scheduleMatch[2];
        const schedule = state.schedules.find((item) => item.id === scheduleId && item.home_id === homeId);
        if (!schedule) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Schedule not found' }) });
          return;
        }
        if (method === 'PATCH') {
          Object.assign(schedule, body, { updated_at: '2026-08-28T10:00:00Z' });
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schedule) });
          return;
        }
        if (method === 'DELETE') {
          state.schedules = state.schedules.filter((item) => item.id !== scheduleId);
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        if (method === 'POST' && action === 'complete') {
          schedule.last_completed = '2026-08-28T10:00:00Z';
          schedule.updated_at = '2026-08-28T10:00:00Z';
          const result: MaintenanceScheduleCompleteResponse = {
            message: `Marked ${schedule.title} complete.`,
            schedule,
            maintenance_record: null,
          };
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
          return;
        }
      }

      if (remainder === 'warranties') {
        if (method === 'GET') {
          const assetId = url.searchParams.get('asset_id');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              state.warranties.filter((item) =>
                item.home_id === homeId && (assetId === null || assetId === 'all' || String(item.asset_id) === assetId),
              ),
            ),
          });
          return;
        }
        if (method === 'POST') {
          const warranty = createWarrantyRecord(state, homeId, body);
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(warranty) });
          return;
        }
      }

      const warrantyMatch = remainder.match(/^warranties\/(\d+)$/);
      if (warrantyMatch) {
        const warrantyId = Number(warrantyMatch[1]);
        const warranty = state.warranties.find((item) => item.id === warrantyId && item.home_id === homeId);
        if (!warranty) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Warranty not found' }) });
          return;
        }
        if (method === 'PATCH') {
          Object.assign(warranty, body, { updated_at: '2026-08-28T10:00:00Z' });
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(warranty) });
          return;
        }
        if (method === 'DELETE') {
          state.warranties = state.warranties.filter((item) => item.id !== warrantyId);
          await route.fulfill({ status: 204, body: '' });
          return;
        }
      }
    }

    if (pathname === '/dashboard' && method === 'GET') {
      const homeId = url.searchParams.get('home_id');
      const payload = toDashboard(state, homeId ? Number(homeId) : undefined);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      return;
    }

    if (pathname === '/analytics/spending' && method === 'GET') {
      const homeId = url.searchParams.get('home_id');
      if (state.slowSpendingDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, state.slowSpendingDelayMs));
      }
      if (state.failSpendingOnce) {
        state.failSpendingOnce = false;
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Spending could not load.' }) });
        return;
      }
      const payload = toSpendingOverview(state, homeId ? Number(homeId) : undefined);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: `Unhandled route: ${pathname}` }) });
  });
}

async function signIn(page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password').fill('StrongPass123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/app/homes');
}

test('signup, Google callback, refresh, currency preference, and logout stay accessible', async ({ page }) => {
  const state = createState();
  await installApiMock(page, state);

  await page.goto('/register');
  await expect(page.getByRole('heading', { name: /create your hupkeep account/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /continue with google/i })).toHaveAttribute('href', /\/auth\/google\/login$/);

  await page.getByLabel('Name').fill('Areej Khan');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password').fill('StrongPass123!');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=owner%40example\.com/);

  await page.goto('/login');
  await expect(page.getByRole('link', { name: /continue with google/i })).toHaveAttribute('href', /\/auth\/google\/login$/);

  await page.goto('/auth/callback#access_token=google-access-token');
  await page.waitForURL('**/app/homes');
  await expect(page.getByRole('heading', { name: /my home/i })).toBeVisible();

  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('major workspace flows survive creation, reloads, long names, and failed spending requests', async ({ page }) => {
  const state = createState();
  state.failSpendingOnce = true;
  state.slowSpendingDelayMs = 600;
  await installApiMock(page, state);

  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: /my home/i })).toBeVisible();

  await page.locator('.page-header-actions').getByRole('button', { name: /add home/i }).click();
  await page.getByLabel('Home name').fill('Lake House with an intentionally long descriptive name for accessibility testing');
  await page.getByLabel('Address').fill('12 Lake View Drive, Somewhere With A Surprisingly Long Address Line, Pakistan');
  await page.getByLabel('Property type').fill('Single-family home');
  await page.getByLabel('Year built').fill('1995');
  await page.getByRole('button', { name: /create home/i }).click();
  await expect(page.getByRole('heading', { name: /lake house with an intentionally long descriptive name/i })).toBeVisible();

  await page.locator('.page-header-actions').getByRole('button', { name: /add home/i }).click();
  await page.getByLabel('Home name').fill('Guest Cottage');
  await page.getByLabel('Address').fill('14 Guest Cottage Lane');
  await page.getByLabel('Property type').fill('Cottage');
  await page.getByLabel('Year built').fill('2005');
  await page.getByRole('button', { name: /create home/i }).click();
  await expect(page.getByText(/guest cottage/i).first()).toBeVisible();

  await page.getByRole('button', { name: /select guest cottage/i }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /guest cottage/i })).toBeVisible();

  await page.locator('.workspace-main .panel').first().getByRole('button', { name: /add area/i }).click();
  await page.getByLabel('Area name').fill('Kitchen');
  await page.getByRole('button', { name: /create area/i }).click();
  await expect(page.locator('.workspace-main .item-card').filter({ hasText: 'Kitchen' }).first()).toBeVisible();

  await page.locator('.workspace-main .panel').first().getByRole('button', { name: /add asset/i }).click();
  const assetDrawer = page.locator('.drawer-panel');
  await assetDrawer.getByLabel('Asset name').fill('HVAC Unit with a long identifying name');
  await assetDrawer.getByLabel('Category').fill('HVAC');
  await assetDrawer.getByLabel('Manufacturer').fill('Carrier');
  await assetDrawer.getByLabel('Model').fill('X1');
  await assetDrawer.getByLabel('Serial number').fill('SN-123');
  await assetDrawer.getByLabel('Expected lifespan (years)').fill('15');
  await assetDrawer.getByLabel('Purchase date').fill('2024-05-01');
  await assetDrawer.getByLabel('Installation date').fill('2024-05-02');
  await assetDrawer.getByLabel('Area').selectOption({ label: 'Kitchen' });
  await page.getByRole('button', { name: /create asset/i }).click();
  await expect(page.getByText(/hvac unit with a long identifying name/i)).toBeVisible();

  await page.getByRole('link', { name: /maintenance/i }).click();
  await expect(page.getByRole('heading', { name: /^maintenance$/i, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /add maintenance/i }).click();
  const maintenanceDrawer = page.locator('.drawer-panel');
  await maintenanceDrawer.getByLabel('Title').fill('Replace AC filter');
  await maintenanceDrawer.getByLabel('Item').fill('AC filter');
  await maintenanceDrawer.getByLabel('Category').selectOption('HVAC');
  await maintenanceDrawer.getByLabel('Description').fill('Quarterly HVAC maintenance');
  await maintenanceDrawer.getByLabel('Date', { exact: true }).fill('2026-08-20');
  await maintenanceDrawer.getByLabel('Cost').fill('42');
  await maintenanceDrawer.getByLabel('Service provider').fill('Cool Air Co');
  await maintenanceDrawer.getByLabel('Next due date').fill('2026-11-20');
  await maintenanceDrawer.getByLabel('Image URL').fill('https://example.com/filter.jpg');
  await maintenanceDrawer.getByLabel('Asset').selectOption({ label: 'HVAC Unit with a long identifying name' });
  await page.getByRole('button', { name: /create record/i }).click();
  await expect(page.getByText(/replace ac filter/i)).toBeVisible();

  await page.getByRole('link', { name: /schedules/i }).click();
  await page.getByRole('button', { name: /add schedule/i }).click();
  const scheduleDrawer = page.locator('.drawer-panel');
  await scheduleDrawer.getByLabel('Title').fill('Test smoke detectors');
  await scheduleDrawer.getByLabel('Description').fill('Monthly safety check');
  await scheduleDrawer.getByLabel('Frequency').selectOption('monthly');
  await scheduleDrawer.getByLabel('Next due date').fill('2026-08-31');
  await scheduleDrawer.getByLabel('Reminder').selectOption({ label: 'Enabled' });
  await scheduleDrawer.getByLabel('Asset').selectOption({ label: 'HVAC Unit with a long identifying name' });
  await page.getByRole('button', { name: /create schedule/i }).click();
  await expect(page.getByText(/test smoke detectors/i)).toBeVisible();
  await page.getByRole('button', { name: /mark complete/i }).click();
  await expect(page.getByText(/marked test smoke detectors complete/i)).toBeVisible();

  await page.getByRole('link', { name: /documents/i }).click();
  await expect(page.getByRole('button', { name: /upload document/i }).first()).toBeEnabled();
  await page.getByRole('button', { name: /upload document/i }).first().click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('pdf'),
  });
  await page.locator('.drawer-panel').getByRole('button', { name: /upload document/i }).click();
  await expect(page.getByText(/receipt\.pdf/i)).toBeVisible();

  await page.getByRole('link', { name: /warranties/i }).click();
  await page.getByRole('button', { name: /add warranty/i }).click();
  const warrantyDrawer = page.locator('.drawer-panel');
  await warrantyDrawer.getByLabel('Provider').fill('Carrier');
  await warrantyDrawer.getByLabel('Coverage details').fill('Parts and labor');
  await warrantyDrawer.getByLabel('Start date').fill('2024-05-01');
  await warrantyDrawer.getByLabel('Expiration date').fill('2027-05-01');
  await warrantyDrawer.getByLabel('Asset').selectOption({ label: 'HVAC Unit with a long identifying name' });
  await warrantyDrawer.getByLabel('Supporting document').selectOption({ label: 'receipt.pdf · Replace AC filter' });
  await page.getByRole('button', { name: /create warranty/i }).click();
  await expect(page.getByText(/carrier/i)).toBeVisible();

  await page.getByRole('link', { name: /spending/i }).click();
  await expect(page.getByRole('heading', { name: /^spending$/i, level: 1 })).toBeVisible();
  await page.getByLabel('Currency').selectOption('USD');
  await expect(page.getByLabel('Currency')).toHaveValue('USD');
  await page.reload();
  await expect(page.getByLabel('Currency')).toHaveValue('USD');

  await page.getByRole('link', { name: /overview/i }).click();
  await expect(page.getByRole('heading', { name: /^overview$/i, level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /my home/i }).click();
  await expect(page.getByRole('heading', { name: /guest cottage/i })).toBeVisible();
  await expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
});

test('failed and slow requests surface errors without blanking the page', async ({ page }) => {
  const state = createState();
  state.homes.push({
    id: 1,
    user_id: 1,
    name: 'Lake House',
    address: '12 Lake View Drive',
    property_type: 'House',
    year_built: 1995,
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  });
  state.sessionToken = 'session-access-token';
  state.currentUser = BASE_USER;
  state.slowSpendingDelayMs = 2500;
  state.failSpendingOnce = true;
  await installApiMock(page, state);

  await page.goto('/app/spending');
  await expect(page.getByText(/loading spending summary/i)).toBeVisible({ timeout: 2000 });
  await expect(page.getByRole('alert')).toContainText(/could not load spending analytics|spending could not load/i);
  await page.reload();
  await expect(page.getByRole('heading', { name: /^spending$/i, level: 1 })).toBeVisible();
});
