import { test, expect } from '@playwright/test';

test.describe('VoiceCart Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003');
  });

  test('should load landing page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('VoiceCart');
  });

  test('should navigate to record page', async ({ page }) => {
    await page.click('a[href="/record"]');
    await expect(page).toHaveURL(/.*record/);
    await expect(page.locator('#record-button')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('a[href="/login"]');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.click('a[href="/register"]');
    await expect(page).toHaveURL(/.*register/);
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('should show OmniPost page', async ({ page }) => {
    await page.goto('http://localhost:3003/omnipost');
    await expect(page.locator('h1')).toContainText('OmniPost');
  });

  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('http://localhost:3003/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated users from settings to login', async ({ page }) => {
    await page.goto('http://localhost:3003/settings');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated users from assets to login', async ({ page }) => {
    await page.goto('http://localhost:3003/assets');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect authenticated users from login to dashboard', async ({ page }) => {
    await page.goto('http://localhost:3003/login');
    // Set auth cookie
    await page.evaluate(() => {
      document.cookie = 'vc_token=fake-jwt-token; path=/';
    });
    await page.goto('http://localhost:3003/login');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show login form elements', async ({ page }) => {
    await page.goto('http://localhost:3003/login');
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should show register form with name field', async ({ page }) => {
    await page.goto('http://localhost:3003/register');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should display subscription page with pricing', async ({ page }) => {
    await page.goto('http://localhost:3003/subscription');
    await expect(page.locator('text=Pick your plan')).toBeVisible();
    await expect(page.locator('text=₹0')).toBeVisible();
    await expect(page.locator('text=₹499')).toBeVisible();
  });

  test('should display not-found page for invalid routes', async ({ page }) => {
    await page.goto('http://localhost:3003/nonexistent-route');
    await expect(page.locator('text=Page Not Found')).toBeVisible();
  });
});
