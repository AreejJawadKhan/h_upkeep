import { expect, test } from '@playwright/test';

test('login and create a home in the workspace', async ({ page }) => {
  const homes: Array<{
    id: number;
    user_id: number;
    name: string;
    address: string;
    property_type: string;
    year_built: number;
    created_at: string;
    updated_at: string;
  }> = [];

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

  await page.route('**/homes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(homes),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        name: string;
        address: string;
        property_type: string;
        year_built: number;
      };
      const created = {
        id: homes.length + 1,
        user_id: 1,
        name: body.name,
        address: body.address,
        property_type: body.property_type,
        year_built: body.year_built,
        created_at: '2026-08-28',
        updated_at: '2026-08-28',
      };
      homes.unshift(created);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    await route.fulfill({ status: 405, body: 'Method not allowed' });
  });

  await page.route('**/homes/*/areas', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/homes/*/assets', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in to hupkeep/i })).toBeVisible();

  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password').fill('StrongPass123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('**/app/homes');
  await expect(page.getByRole('heading', { name: /add a home/i })).toBeVisible();

  await page.getByLabel('Home name').fill('Lake House');
  await page.getByLabel('Address').fill('12 Lake View Drive');
  await page.getByLabel('Property type').fill('House');
  await page.getByLabel('Year built').fill('1995');

  const createHomeResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/homes') &&
      response.status() === 201,
  );
  const homesRefetchResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().endsWith('/homes') &&
      response.status() === 200,
  );

  await page.getByRole('button', { name: /create home/i }).click();
  await createHomeResponse;
  await homesRefetchResponse;

  const createdCard = page.locator('.home-list .home-card').filter({ hasText: 'Lake House' });
  await expect(createdCard).toBeVisible();
  await expect(createdCard).toContainText('12 Lake View Drive');
  await expect(page.getByRole('heading', { name: /lake house/i })).toBeVisible();

  await page.evaluate(() => {
    window.history.pushState({}, '', '/app/homes?home=1.');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { name: /lake house/i })).toBeVisible();
  await expect(createdCard).toContainText('12 Lake View Drive');
});
