import { expect, test, type Page } from '@playwright/test';

/**
 * Browser-level tests for behaviour that a DOM emulator cannot check honestly:
 * real focus and blur, layout-driven popup positioning, and native click
 * dispatch through the modal stack.
 */

const result = (page: Page) => page.locator('#output');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('basic dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('#demo-basic');
    await expect(page.locator('.dl-modal')).toBeVisible();
  });

  test('renders the fields and confirms with their values', async ({ page }) => {
    await page.fill('.dl-form input[name=title]', 'Field notes');
    await page.fill('.dl-form textarea[name=summary]', 'Line one');
    await page.click('.dl-modal .btn');

    await expect(page.locator('.dl-modal')).toHaveCount(0);
    await expect(result(page)).toContainText('"title": "Field notes"');
    await expect(result(page)).toContainText('"summary": "Line one"');
  });

  test('applies the select default value', async ({ page }) => {
    await expect(page.locator('dl-select[name=language]')).toHaveAttribute('value', 'en');
  });

  test('closes on the ✕ button', async ({ page }) => {
    await page.click('.dl-modal .cancelBtn');
    await expect(page.locator('.dl-modal')).toHaveCount(0);
  });

  test('closes on Escape', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.dl-modal')).toHaveCount(0);
  });

  test('renders a checkbox caption marked with html() as a real link', async ({ page }) => {
    await expect(page.locator('.dl-form .check a')).toHaveText('terms');
  });

  test('gives every labelled control a working label association', async ({ page }) => {
    // Regression: v1 pointed label[for] at the field name, which was never an id.
    const orphans = await page.evaluate(() =>
      [...document.querySelectorAll('.dl-form label[for]')].filter(
        (label) => !document.getElementById(label.getAttribute('for') as string),
      ).length,
    );
    expect(orphans).toBe(0);
  });

  test('reaches the confirm button by keyboard', async ({ page }) => {
    // Buttons are <button> in v2, so they are in the tab order.
    const focusable = await page.evaluate(() => {
      const button = document.querySelector('.dl-modal .btn') as HTMLElement;
      button.focus();
      return document.activeElement === button;
    });
    expect(focusable).toBe(true);
  });
});

test.describe('combobox', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('#demo-basic');
    await expect(page.locator('.dl-modal')).toBeVisible();
  });

  test('opens on focus and closes on blur', async ({ page }) => {
    const options = page.locator('.options-wrapper[data-for-dl-select=language]');
    await expect(options).toBeHidden();

    await page.click('dl-select[name=language] input');
    await expect(options).toBeVisible();

    await page.click('.dl-form input[name=title]');
    await expect(options).toBeHidden();
  });

  test('positions the popup directly under the input', async ({ page }) => {
    await page.click('dl-select[name=language] input');

    const gap = await page.evaluate(() => {
      const select = document.querySelector('dl-select[name=language]') as HTMLElement;
      const input = select.querySelector('.input-wrapper') as HTMLElement;
      const options = document.querySelector(
        '.options-wrapper[data-for-dl-select=language]',
      ) as HTMLElement;
      return options.getBoundingClientRect().top - input.getBoundingClientRect().bottom;
    });

    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(10);
  });

  test('filters as you type and selects with the keyboard', async ({ page }) => {
    await page.click('dl-select[name=language] input');
    await page.keyboard.type('ger');

    const visible = page.locator(
      '.options-wrapper[data-for-dl-select=language] dl-option:visible',
    );
    await expect(visible).toHaveCount(1);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.locator('dl-select[name=language]')).toHaveAttribute('value', 'de');
  });

  test('shows the no-match hint', async ({ page }) => {
    await page.click('dl-select[name=language] input');
    await page.keyboard.type('klingon');

    await expect(
      page.locator('.options-wrapper[data-for-dl-select=language] .noMatchesHint'),
    ).toBeVisible();
  });

  test('adds and removes multi-select tags', async ({ page }) => {
    await page.click('dl-select[name=tags] input');
    await page.click('.options-wrapper[data-for-dl-select=tags] dl-option:has-text("docs")');
    await expect(page.locator('dl-select[name=tags] .multiselect-tag')).toHaveCount(1);

    await page.click('dl-select[name=tags] .dl-muliselect-selected-remove');
    await expect(page.locator('dl-select[name=tags] .multiselect-tag')).toHaveCount(0);
  });
});

test.describe('reactivity', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('#demo-reactive');
    await expect(page.locator('.dl-modal')).toBeVisible();
  });

  test('shows the loading skeleton while options resolve', async ({ page }) => {
    await page.fill('.dl-form input[name=owner]', 'torvalds');
    await expect(page.locator('dl-select[name=repo].dl-select-loading')).toBeVisible();
    await expect(page.locator('dl-select[name=repo].dl-select-loading')).toBeHidden({
      timeout: 5000,
    });
  });

  test('reloads dependent options when the owner changes', async ({ page }) => {
    await page.fill('.dl-form input[name=owner]', 'torvalds');
    await expect(
      page.locator('.options-wrapper[data-for-dl-select=repo] dl-option').first(),
    ).toHaveText('torvalds/declarative-forms', { timeout: 5000 });
  });

  test('hides and reveals a field through isActive', async ({ page }) => {
    const token = page.locator('#dl-form-field-wrapper-for-token');
    await expect(token).toBeHidden();

    await page.click('dl-select[name=source] input');
    await page.click('.options-wrapper[data-for-dl-select=source] dl-option:has-text("GitLab")');

    await expect(token).toBeVisible();
  });

  test('keeps only the newest response when options are reloaded rapidly', async ({
    page,
  }) => {
    const owner = page.locator('.dl-form input[name=owner]');
    await owner.fill('first');
    await owner.fill('second');
    await owner.fill('third');

    await expect(
      page.locator('.options-wrapper[data-for-dl-select=repo] dl-option').first(),
    ).toHaveText('third/declarative-forms', { timeout: 5000 });
  });
});

test.describe('tabs and buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('#demo-tabs');
    await expect(page.locator('.dl-modal')).toBeVisible();
  });

  test('shows one tab at a time and switches on click', async ({ page }) => {
    await expect(page.locator('.dl-tab-btn')).toHaveCount(3);
    await expect(page.locator('#dl-form-field-wrapper-for-name')).toBeVisible();
    await expect(page.locator('#dl-form-field-wrapper-for-email')).toBeHidden();

    await page.click('.dl-tab-btn.Delivery');
    await expect(page.locator('#dl-form-field-wrapper-for-email')).toBeVisible();
    await expect(page.locator('.dl-tab-btn.Delivery')).toHaveClass(/active/);
  });

  test('navigates tabs through sibling order, as monsterwriter does', async ({ page }) => {
    await page.click('#nextBtn');
    await expect(page.locator('.dl-tab-btn.Export')).toHaveClass(/active/);

    await page.click('#backBtn');
    await expect(page.locator('.dl-tab-btn.General')).toHaveClass(/active/);
  });

  test('enables the export button only once the async predicate passes', async ({
    page,
  }) => {
    await expect(page.locator('#exportBtn')).toHaveClass(/disabled/);

    await page.click('.dl-tab-btn.Delivery');
    await page.fill('.dl-form input[name=email]', 'ada@example.com');

    await expect(page.locator('#exportBtn')).not.toHaveClass(/disabled/);
  });

  test('selects a card', async ({ page }) => {
    await page.click('.dl-tab-btn.Export');
    await page.click('.detailed-option[data-value=pdf]');
    await expect(page.locator('.detailed-option[data-value=pdf]')).toHaveClass(/active/);
  });
});

test.describe('array entries', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('#demo-array');
    await expect(page.locator('.dl-modal')).toBeVisible();
  });

  test('adds, edits and removes an entry through nested dialogs', async ({ page }) => {
    await page.click('.dl-form-array-of-add-entry');
    await expect(page.locator('.form-for-array-of-authors')).toBeVisible();

    // The parent dialog is hidden while the entry dialog is on top.
    await expect(page.locator('.dl-modal.dl-modal-hidden')).toHaveCount(1);

    await page.fill('.form-for-array-of-authors input[name=preName]', 'Ada');
    await page.fill('.form-for-array-of-authors input[name=lastName]', 'Lovelace');
    await page.click('.form-for-array-of-authors ~ * .btn, .dl-modal:last-of-type .btn');

    const entry = page.locator('.dl-form-array-of-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry.locator('span')).toContainText('Ada Lovelace');
    await expect(page.locator('.dl-modal.dl-modal-hidden')).toHaveCount(0);

    await entry.locator('.edit-array-of-btn').click();
    await expect(
      page.locator('.form-for-array-of-authors input[name=preName]'),
    ).toHaveValue('Ada');
    await page.fill('.form-for-array-of-authors input[name=preName]', 'Augusta');
    await page.click('.dl-modal:last-of-type .btn');
    await expect(entry.locator('span')).toContainText('Augusta Lovelace');

    await entry.locator('.delete-array-of-btn').click();
    await expect(page.locator('.dl-form-array-of-entry')).toHaveCount(0);
  });

  test('keeps the entry dialog confirm disabled until the record is valid', async ({
    page,
  }) => {
    await page.click('.dl-form-array-of-add-entry');
    const confirm = page.locator('.dl-modal:last-of-type .low-bar .btn');
    await expect(confirm).toHaveClass(/disabled/);

    await page.fill('.form-for-array-of-authors input[name=lastName]', 'Hopper');
    await expect(confirm).not.toHaveClass(/disabled/);
  });

  test('accepts a suggestion into the value', async ({ page }) => {
    // The input itself is `visibility: hidden`; the visible box is its ::before
    // and the label is what a user clicks. See docs/accessibility.md.
    await page.click('.dl-form-array-of-suggestion:has-text("Ada") label');
    await expect(
      page.locator('.dl-form-array-of-suggestion:has-text("Ada") input'),
    ).toBeChecked();

    await page.click('.dl-modal .low-bar .btn');
    await expect(result(page)).toContainText('Lovelace');
  });
});

test.describe('embedded form', () => {
  test('renders inline and streams values as you type', async ({ page }) => {
    await page.click('#demo-embedded');

    await expect(page.locator('#embedded .dl-modal.noModalDialog')).toBeVisible();
    await page.fill('#embedded input[name=query]', 'hello');

    await expect(result(page)).toContainText('"query": "hello"');
    await expect(page.locator('#embedded .message')).toHaveText('You typed: hello');
  });
});
