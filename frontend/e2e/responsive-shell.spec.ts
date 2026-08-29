import { expect, test } from '@playwright/test';

type ViewportCase = {
  name: string;
  width: number;
  height: number;
  mobile: boolean;
};

const viewports: ViewportCase[] = [
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 834, height: 1112, mobile: false },
  { name: 'desktop', width: 1440, height: 1024, mobile: false },
];

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

const schedule = {
  id: 31,
  user_id: 1,
  home_id: 1,
  asset_id: 11,
  title: 'Test smoke detectors',
  description: 'Monthly safety check',
  frequency: 'monthly',
  next_due_date: '2026-08-31',
  last_completed: '2026-07-31',
  reminder_enabled: true,
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

async function installAuthMocks(page) {
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

async function installWorkspaceMocks(page) {
  await page.route('**/homes', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([home]),
      });
      return;
    }

    await route.fulfill({ status: 405, body: 'Method not allowed' });
  });

  await page.route('**/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scope_home_id: null,
        scope_home_name: null,
        home_count: 1,
        asset_count: 1,
        maintenance_record_count: 1,
        schedule_count: 1,
        warranty_count: 1,
        due_soon_count: 1,
        overdue_count: 0,
        expiring_soon_count: 1,
        expired_warranty_count: 0,
        total_spend: 42,
        this_month_spend: 42,
        this_year_spend: 42,
        average_cost: 42,
        upcoming_maintenance: [
          {
            kind: 'maintenance',
            title: 'Replace AC filter',
            description: 'Quarterly HVAC maintenance',
            due_date: '2026-08-31',
            home_id: 1,
            home_name: 'Lake House',
            asset_id: 11,
            asset_name: 'HVAC Unit',
            status: 'due_soon',
            source_id: 21,
          },
        ],
        warranty_alerts: [
          {
            status: 'expiring_soon',
            provider: 'Carrier',
            asset_name: 'HVAC Unit',
            home_id: 1,
            home_name: 'Lake House',
            expiration_date: '2027-05-01',
            source_id: 51,
            document_id: 41,
          },
        ],
        recent_activity: [
          {
            kind: 'document',
            title: 'Uploaded receipt.pdf',
            description: 'Attached to Replace AC filter',
            timestamp: '2026-08-20T08:30:00Z',
            home_id: 1,
            home_name: 'Lake House',
            asset_id: 11,
            asset_name: 'HVAC Unit',
            source_id: 41,
          },
        ],
        home_health: [
          {
            home_id: 1,
            home_name: 'Lake House',
            asset_count: 1,
            maintenance_record_count: 1,
            schedule_count: 1,
            warranty_count: 1,
            due_soon_count: 1,
            overdue_count: 0,
            expiring_soon_count: 1,
            expired_warranty_count: 0,
            status_label: 'Watch',
            summary: 'One item is due soon.',
          },
        ],
        spending: {
          scope_home_id: null,
          scope_home_name: null,
          total_spend: 42,
          this_month_spend: 42,
          this_year_spend: 42,
          previous_year_spend: 0,
          average_cost: 42,
          record_count: 1,
          monthly_trend: [
            { label: 'Aug', total_spend: 42, record_count: 1 },
          ],
          category_breakdown: [
            { category: 'HVAC', total_spend: 42, record_count: 1 },
          ],
          asset_breakdown: [
            { asset_id: 11, asset_name: 'HVAC Unit', total_spend: 42, record_count: 1 },
          ],
          recent_records: [
            {
              id: 21,
              title: 'Replace AC filter',
              date: '2026-08-20',
              category: 'HVAC',
              cost: 42,
              service_provider: 'Cool Air Co',
              home_id: 1,
              home_name: 'Lake House',
              asset_id: 11,
              asset_name: 'HVAC Unit',
              created_at: '2026-08-20T08:30:00Z',
            },
          ],
        },
      }),
    });
  });

  await page.route('**/homes/1/areas', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/homes/1/assets', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([asset]),
    });
  });

  await page.route('**/homes/1/maintenance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([maintenanceRecord]),
    });
  });

  await page.route('**/homes/1/schedules', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([schedule]),
    });
  });

  await page.route('**/homes/1/maintenance/21/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([document]),
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

  await page.route('**/analytics/spending', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scope_home_id: null,
        scope_home_name: null,
        total_spend: 42,
        this_month_spend: 42,
        this_year_spend: 42,
        previous_year_spend: 0,
        average_cost: 42,
        record_count: 1,
        monthly_trend: [{ label: 'Aug', total_spend: 42, record_count: 1 }],
        category_breakdown: [{ category: 'HVAC', total_spend: 42, record_count: 1 }],
        asset_breakdown: [{ asset_id: 11, asset_name: 'HVAC Unit', total_spend: 42, record_count: 1 }],
        recent_records: [
          {
            id: 21,
            title: 'Replace AC filter',
            date: '2026-08-20',
            category: 'HVAC',
            cost: 42,
            service_provider: 'Cool Air Co',
            home_id: 1,
            home_name: 'Lake House',
            asset_id: 11,
            asset_name: 'HVAC Unit',
            created_at: '2026-08-20T08:30:00Z',
          },
        ],
      }),
    });
  });
}

const routes = [
  { link: /overview/i, heading: /overview/i },
  { link: /my home/i, heading: /my home/i },
  { link: /maintenance/i, heading: /maintenance/i },
  { link: /schedules/i, heading: /schedules/i },
  { link: /spending/i, heading: /spending/i },
  { link: /documents/i, heading: /documents/i },
  { link: /warranties/i, heading: /warranties/i },
] as const;

for (const viewport of viewports) {
  test.describe(`${viewport.name} viewport`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('major workspace pages stay usable', async ({ page }) => {
      await installAuthMocks(page);
      await installWorkspaceMocks(page);

      await page.goto('/login');
      await page.getByLabel('Email').fill('owner@example.com');
      await page.getByLabel('Password').fill('StrongPass123!');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL('**/app/homes');

      if (viewport.mobile) {
        await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeVisible();
        await expect(page.locator('.sidebar')).toBeHidden();

        await page.getByRole('button', { name: /open navigation menu/i }).click();
        await expect(page.getByRole('dialog', { name: /navigation menu/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /overview/i }).first()).toBeVisible();
      } else {
        await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeHidden();
        await expect(page.locator('.sidebar')).toBeVisible();
      }

      for (const route of routes) {
        if (viewport.mobile) {
          const drawer = page.locator('#mobile-nav-drawer');
          if (await drawer.count()) {
            await page.getByRole('button', { name: /close navigation menu/i }).click();
            await expect(drawer).toHaveCount(0);
          }

          await page.getByRole('button', { name: /open navigation menu/i }).click();
          await page.getByRole('link', { name: route.link }).click();
          await expect(page.locator('#mobile-nav-drawer')).toHaveCount(0);
        } else {
          await page.getByRole('link', { name: route.link }).click();
        }

        await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible();

        const noHorizontalOverflow = await page.evaluate(() => {
          const { scrollWidth, clientWidth } = document.documentElement;
          return scrollWidth <= clientWidth + 1;
        });
        expect(noHorizontalOverflow).toBeTruthy();
      }
    });
  });
}
