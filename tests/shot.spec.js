import { test } from '@playwright/test';

// Not an assertion suite -- `npm run shot` captures what the deployed site
// currently looks like, for eyeballing after a push.

test('capture homepage', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.screenshot({
    path: `screenshots/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test.describe('close-ups', () => {
  // 3x scale so 40px icons are big enough to judge weight and alignment.
  test.use({ deviceScaleFactor: 3, viewport: { width: 1280, height: 900 } });

  test('capture social icon row', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('header .footer__social').first().screenshot({
      path: `screenshots/social-header-${testInfo.project.name}.png`,
    });
    await page.locator('footer .footer__social').first().screenshot({
      path: `screenshots/social-footer-${testInfo.project.name}.png`,
    });
  });
});
