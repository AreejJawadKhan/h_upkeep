import { expect, test } from '@playwright/test';

async function mockAuth(page) {
  await page.route('**/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'No session' }),
    });
  });

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test-access-token',
        token_type: 'bearer',
        user: {
          id: 1,
          name: 'Areej Khan',
          email: 'owner@example.com',
          email_verified: true,
          created_at: '2026-08-28',
        },
      }),
    });
  });

  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'Areej Khan',
        email: 'owner@example.com',
        email_verified: true,
        created_at: '2026-08-28',
      }),
    });
  });
}

async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password').fill('StrongPass123!');
  await page.getByRole('button', { name: /sign in/i }).click();
}

const home = {
  id: 1,
  user_id: 1,
  name: 'Lake House',
  address: '12 Lake View Drive',
  property_type: 'House',
  year_built: 1995,
  created_at: '2026-08-28',
  updated_at: '2026-08-28',
};

const asset = {
  id: 11,
  home_id: 1,
  area_id: null,
  name: 'HVAC Unit',
  category: 'HVAC',
  manufacturer: 'Carrier',
  model: 'X1',
  serial_number: 'SN-123',
  purchase_date: '2024-05-01',
  installation_date: '2024-05-02',
  expected_lifespan: 15,
  notes: null,
  created_at: '2026-08-28',
  updated_at: '2026-08-28',
};

const maintenanceRecord = {
  id: 21,
  user_id: 1,
  home_id: 1,
  asset_id: 11,
  title: 'Replace AC filter',
  description: 'Quarterly HVAC maintenance',
  item: 'AC filter',
  category: 'HVAC',
  date: '2026-08-20',
  cost: 42,
  service_provider: 'Cool Air Co',
  next_due_date: '2026-11-20',
  image_url: null,
  created_at: '2026-08-20T08:30:00Z',
  updated_at: '2026-08-20T08:30:00Z',
};

const document = {
  id: 41,
  maintenance_id: 21,
  maintenance_title: 'Replace AC filter',
  file_name: 'receipt.pdf',
  file_type: 'application/pdf',
  cloudinary_url: 'https://example.com/receipt.pdf',
  created_at: '2026-08-20T08:30:00Z',
};

const warranty = {
  id: 51,
  user_id: 1,
  home_id: 1,
  asset_id: 11,
  document_id: 41,
  provider: 'Carrier',
  coverage_details: 'Parts and labor',
  start_date: '2024-05-01',
  expiration_date: '2027-05-01',
  created_at: '2026-08-20T08:30:00Z',
  updated_at: '2026-08-20T08:30:00Z',
};

test('empty spending shows a single focused empty state', async ({ page }) => {
  await mockAuth(page);

  await page.route('**/homes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/analytics/spending', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scope_home_id: null,
        scope_home_name: null,
        total_spend: 0,
        this_month_spend: 0,
        this_year_spend: 0,
        previous_year_spend: 0,
        average_cost: 0,
        record_count: 0,
        monthly_trend: [],
        category_breakdown: [],
        asset_breakdown: [],
        recent_records: [],
      }),
    });
  });

  await login(page);
  await page.waitForURL('**/app/homes');
  await page.getByRole('link', { name: /spending/i }).click();

  await expect(page.getByRole('heading', { name: /^spending$/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/no spending yet/i)).toBeVisible();
  await expect(page.locator('.stat-card')).toHaveCount(0);
  await expect(page.locator('.split-panels')).toHaveCount(0);
});

test('low-data documents keep the page compact and context-driven', async ({ page }) => {
  await mockAuth(page);

  await page.route('**/homes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([home]),
    });
  });

  await page.route('**/homes/1/maintenance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([maintenanceRecord]),
    });
  });

  await page.route('**/homes/1/maintenance/21/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await login(page);
  await page.waitForURL('**/app/homes');
  await page.getByRole('link', { name: /documents/i }).click();

  await expect(page.getByRole('heading', { name: /^documents$/i, level: 1 })).toBeVisible();
  await expect(page.locator('.workspace-sidebar')).toHaveCount(0);
  await expect(page.getByText(/no documents yet/i)).toBeVisible();
  await expect(page.getByText(/selected record/i)).toHaveCount(0);
});

test('populated warranties reveal the timeline and summary cards', async ({ page }) => {
  await mockAuth(page);

  await page.route('**/homes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([home]),
    });
  });

  await page.route('**/homes/1/assets', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([asset]),
    });
  });

  await page.route('**/homes/1/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([document]),
    });
  });

  await page.route('**/homes/1/warranties', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([warranty]),
    });
  });

  await login(page);
  await page.waitForURL('**/app/homes');
  await page.getByRole('link', { name: /warranties/i }).click();

  await expect(page.getByRole('heading', { name: /^warranties$/i, level: 1 })).toBeVisible();
  await expect(page.locator('.workspace-sidebar')).toHaveCount(0);
  await expect(page.locator('.warranty-list .warranty-card')).toHaveCount(1);
  await expect(page.locator('.stat-card')).toHaveCount(4);
});
