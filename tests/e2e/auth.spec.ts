import { test, expect } from '@playwright/test';

test('login and reach dashboard', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set in .env.test.local'
    );
  }

  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Login to Nexora' })
  ).toBeVisible();

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/auth/login') &&
      response.request().method() === 'POST'
  );

  await page.getByRole('button', { name: 'Login' }).click();

  const response = await responsePromise;

  console.log('LOGIN STATUS:', response.status());
  console.log('LOGIN URL:', response.url());

  if (!response.ok()) {
    console.log('LOGIN RESPONSE:', await response.text());
  }

  await expect(page).toHaveURL(/\/dashboard/);

  await expect(
    page.getByRole('heading', { name: 'Dashboard' })
  ).toBeVisible();
});