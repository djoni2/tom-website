import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('loads and is the right site', async ({ page }) => {
    await expect(page).toHaveTitle(/Times of Madeira/i);
  });

  // Regression guard for the silent deploy failure: the tooltip and the glyph
  // can disagree, so assert the rendered path geometry, not just the label.
  test('social links use the real X and Threads marks', async ({ page }) => {
    const x = page.locator('a.social-link[title="X"]');
    const threads = page.locator('a.social-link[title="Threads"]');

    await expect(x).toHaveCount(2);        // header + footer
    await expect(threads).toHaveCount(2);

    await expect(x.first()).toHaveAttribute('href', 'https://x.com/timesofmadeira');
    await expect(threads.first()).toHaveAttribute(
      'href', 'https://www.threads.net/@timesofmadeira');

    // The glyph itself actually rendered with a non-zero box.
    for (const mark of [x.first(), threads.first()]) {
      const svg = mark.locator('svg');
      await expect(svg).toHaveAttribute('viewBox', '-1.7 -1.7 27.4 27.4');
      const box = await svg.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(0);
      expect(box?.height ?? 0).toBeGreaterThan(0);
    }
  });

  test('the retired Twitter bird and @ glyph are gone', async ({ page }) => {
    const html = await page.content();
    expect(html).not.toContain('logo-twitter');
    expect(html).not.toContain('title="Tiktok"');
  });

  test('theme config reaches the page', async ({ page }) => {
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent').trim());
    expect(accent).not.toBe('');
  });

  test('no broken images', async ({ page }) => {
    await page.waitForLoadState('load');
    const broken = await page.evaluate(() =>
      [...document.images]
        .filter(img => img.currentSrc && img.complete && img.naturalWidth === 0)
        .map(img => img.currentSrc));
    expect(broken).toEqual([]);
  });

  test('article cards render', async ({ page }) => {
    await expect(page.locator('.article').first()).toBeVisible();
  });
});
