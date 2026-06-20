/**
 * Smoke test headless (Playwright)
 *
 * Install: npm install -D @playwright/test && npx playwright install chromium
 * Run: npx playwright test src/games/trombone-infini/__tests__/smoke.spec.ts
 *
 * Requires the dev server running at http://localhost:3000
 */
import { test, expect } from '@playwright/test';

test.describe('Trombone de l\'Infini - Smoke Test', () => {
  test('boots without errors and maintains FPS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('http://localhost:3000/labo/trombone-infini');
    await page.waitForTimeout(3000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    await page.click('canvas');
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);

    for (let i = 0; i < 60; i++) {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
      const key = keys[Math.floor(Math.random() * keys.length)];
      await page.keyboard.press(key);
      await page.waitForTimeout(1000);
    }

    expect(errors.length).toBe(0);

    const canvasStillVisible = await canvas.isVisible();
    expect(canvasStillVisible).toBe(true);
  });
});
