import { test, expect } from '@playwright/test';

test('create a project from dashboard', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  await expect(
    page.getByRole('heading', { name: 'Dashboard' })
  ).toBeVisible();

  await page.getByPlaceholder('Project name').fill(
    'Playwright E2E Project'
  );

  await page
    .getByPlaceholder('Description (optional)')
    .fill('Created automatically by Playwright.');

  await page
    .getByRole('button', { name: 'Create Project' })
    .click();

  await expect(
    page.getByText('Playwright E2E Project')
  ).toBeVisible();
});