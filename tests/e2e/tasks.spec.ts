import { test, expect } from '@playwright/test';

test('create a task inside a project', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set in .env.test.local'
    );
  }

  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByPlaceholder('Project name').fill(
    'Playwright Task Test Project'
  );

  await page
    .getByPlaceholder('Description (optional)')
    .fill('Project used for task E2E testing.');

  await page
    .getByRole('button', { name: 'Create Project' })
    .click();

  const projectLink = page.getByRole('link', {
    name: /Playwright Task Test Project/,
  });

  await expect(projectLink).toBeVisible();

  await projectLink.click();

  await expect(page).toHaveURL(/\/projects\/.+/);

  await expect(
    page.getByRole('heading', {
      name: 'Playwright Task Test Project',
    })
  ).toBeVisible();

  await page.getByPlaceholder('Task title').fill(
    'Playwright E2E Task'
  );

  await page
    .getByPlaceholder('Task description (optional)')
    .fill('Created by the Playwright E2E test.');

  await page
    .getByRole('button', { name: 'Create Task' })
    .click();

  await expect(
    page.getByText('Playwright E2E Task')
  ).toBeVisible();
});