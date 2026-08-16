import { expect, test, type Page } from '@playwright/test';
import { DOCS_ORIGIN } from '../playwright.config.js';

/**
 * The documentation's live demos.
 *
 * Each demo evaluates the exact code block shown on the page, which is what
 * keeps the snippet and the running form from drifting apart — but it also
 * means a broken snippet is invisible until a browser runs it. VitePress will
 * happily build a page whose demo throws on mount.
 */

const BASE = `${DOCS_ORIGIN}/declarative-forms`;

const PAGES = [
  '/',
  '/guide/getting-started',
  '/guide/fields/text',
  '/guide/fields/textarea',
  '/guide/fields/select',
  '/guide/fields/checkbox',
  '/guide/fields/message',
  '/guide/fields/file',
  '/guide/fields/computed',
  '/guide/fields/cards',
  '/guide/fields/custom',
  '/guide/fields/array',
  '/guide/reactivity',
  '/guide/tabs',
  '/guide/modals',
  '/guide/buttons',
  '/guide/arrays',
  '/guide/security',
];

/** Navigate and fail on any uncaught page error. */
async function open(page: Page, path: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(path === '/' ? `${BASE}/` : `${BASE}${path}.html`);
  return errors;
}

test.describe('every demo compiles and mounts', () => {
  for (const path of PAGES) {
    test(`on ${path}`, async ({ page }) => {
      const errors = await open(page, path);

      const demos = page.locator('.live-form');
      const count = await demos.count();
      expect(count, 'page should contain at least one live demo').toBeGreaterThan(0);

      // The component reports a compile failure here rather than throwing.
      await expect(page.locator('.live-form__error')).toHaveCount(0);

      for (let i = 0; i < count; i++) {
        const demo = demos.nth(i);
        const isModal = (await demo.locator('.live-form__open').count()) > 0;

        if (!isModal) {
          await expect(demo.locator('.live-form__host .dl-form')).toBeVisible();
        }
      }

      expect(errors).toEqual([]);
    });
  }
});

test.describe('demos are genuinely interactive', () => {
  test('typing flows into the values panel', async ({ page }) => {
    const errors = await open(page, '/guide/fields/text');

    await page.fill('.live-form__host input[name=title]', 'Field notes');
    await expect(page.locator('.live-form__values').first()).toContainText('Field notes');

    expect(errors).toEqual([]);
  });

  test('isActive shows a field and adds it to the values', async ({ page }) => {
    await open(page, '/guide/reactivity');

    const token = page.locator('#dl-form-field-wrapper-for-token');
    await expect(token).toBeHidden();

    await page.click('.live-form__host dl-select[name=source] input');
    await page.click(
      '.options-wrapper[data-for-dl-select=source] dl-option:has-text("GitLab")',
    );

    await expect(token).toBeVisible();
    await expect(page.locator('.live-form__values').first()).toContainText('token');
  });

  test('a modal demo opens a real dialog', async ({ page }) => {
    await open(page, '/guide/tabs');

    await page.click('.live-form__open');
    await expect(page.locator('.dl-modal .dl-tab-btn')).not.toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.locator('.dl-modal')).toHaveCount(0);
  });

  test('the computed demo reports its derived value on submit', async ({ page }) => {
    await open(page, '/guide/fields/computed');

    await page.click('.live-form__host .low-bar .btn');
    await expect(page.locator('.live-form__values--ok')).toContainText(
      '"domain": "example.com"',
    );
  });

  test('html() renders markup while a plain string does not', async ({ page }) => {
    await open(page, '/guide/security');

    const demo = page.locator('.live-form__host');
    await expect(demo.locator('.check:has-text("Rendered as markup") b')).toHaveCount(1);
    await expect(demo.locator('.check:has-text("Rendered literally") b')).toHaveCount(0);
  });
});
