/**
 * The frozen DOM contract.
 *
 * v2 rewrites the authoring API but deliberately keeps the *rendered* DOM
 * compatible with v1, because consumers style ~60 of these class names, select
 * on these ids, and drive the tab strip through sibling navigation. A failure
 * here means a consumer stylesheet or end-to-end suite will break, so treat it
 * as a contract change, not a test to update.
 *
 * See docs/dom-contract.md.
 */
import { describe, expect, it } from 'vitest';
import { html } from '../src/util/html.js';
import { makeForm } from './helpers.js';

describe('form scaffolding', () => {
  it('wraps a <form> in .dl-form', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }] });
    expect(form.dom.className).toBe('dl-form');
    expect(form.dom.children[0]?.tagName).toBe('FORM');
  });

  it('gives every field wrapper the documented id and class', async () => {
    const form = await makeForm({ fields: [{ name: 'citeKey' }] });
    const wrapper = form.formElement.children[0]!;

    expect(wrapper.id).toBe('dl-form-field-wrapper-for-citeKey');
    expect(wrapper.classList.contains('dl-form-field-wrapper')).toBe(true);
  });

  it('stamps the tab class on the wrapper', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', tab: 'Reference Sources' }],
    });
    expect(form.field('a')!.wrapper.classList.contains('ReferenceSources')).toBe(true);
  });

  it('keeps fields in declaration order inside the form', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    });
    expect([...form.formElement.children].map((el) => el.id)).toEqual([
      'dl-form-field-wrapper-for-a',
      'dl-form-field-wrapper-for-b',
      'dl-form-field-wrapper-for-c',
    ]);
  });
});

describe('control elements per kind', () => {
  it.each([
    ['text', {}, 'INPUT'],
    ['textarea', { kind: 'textarea' }, 'TEXTAREA'],
    ['select', { kind: 'select', options: [] }, 'DL-SELECT'],
    ['checkbox', { kind: 'checkbox', label: 'x' }, 'SPAN'],
    ['message', { kind: 'message', message: 'x' }, 'P'],
    ['file', { kind: 'file' }, 'DIV'],
    ['computed', { kind: 'computed', compute: () => '' }, 'INPUT'],
    ['cards', { kind: 'cards', cards: [] }, 'DIV'],
    ['custom', { kind: 'custom', render: () => {} }, 'P'],
    ['array', { kind: 'array', of: [] }, 'DIV'],
  ])('%s renders a %s', async (_name, extra, tagName) => {
    const form = await makeForm({
      fields: [{ name: 'f', ...extra } as never],
    });
    expect(form.field('f')!.element.tagName).toBe(tagName);
  });

  it.each([
    ['message', { kind: 'message', message: 'x' }, 'message'],
    ['file', { kind: 'file' }, 'file-field'],
    ['cards', { kind: 'cards', cards: [] }, 'detailed-options'],
    ['custom', { kind: 'custom', render: () => {} }, 'render'],
    ['array', { kind: 'array', of: [] }, 'array-of'],
    ['checkbox', { kind: 'checkbox', label: 'x' }, 'check'],
  ])('%s carries the .%s class', async (_name, extra, className) => {
    const form = await makeForm({ fields: [{ name: 'f', ...extra } as never] });
    expect(form.field('f')!.element.classList.contains(className)).toBe(true);
  });

  it('marks a select wrapper', async () => {
    const form = await makeForm({
      fields: [{ name: 'f', kind: 'select', options: [] }],
    });
    expect(form.field('f')!.wrapper.classList.contains('dl-select-wrapper')).toBe(true);
  });

  it('marks a computed field wrapper as hidden', async () => {
    const form = await makeForm({
      fields: [{ name: 'f', kind: 'computed', compute: () => '' }],
    });
    expect(form.field('f')!.wrapper.classList.contains('dl-form-hidden-field')).toBe(true);
  });
});

describe('modal chrome', () => {
  it('renders the exact element hierarchy', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', tab: 'One' }],
      buttons: { OK: { action: () => {} } },
      onCancel: () => {},
    });

    const wrapper = form.openInModal();
    expect(wrapper.className).toBe('dl-modal');

    const modal = wrapper.children[0]!;
    expect(modal.className).toBe('modal');
    expect([...modal.children].map((c) => c.className)).toEqual([
      'up-bar',
      'tabWrapper',
      'modal-content',
      'low-bar',
    ]);

    expect(modal.querySelector('.up-bar > .cancelBtn.secondary')).not.toBeNull();
    expect(modal.querySelector('.modal-content > .dl-form')).not.toBeNull();
    expect(modal.querySelector('.low-bar > .btn')).not.toBeNull();
  });

  it('marks an embedded form with noModalDialog', async () => {
    const host = document.createElement('div');
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    form.appendInElement(host);

    expect(host.querySelector('.dl-modal.noModalDialog')).not.toBeNull();
  });

  it('hides a covered dialog with dl-modal-hidden', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    const wrapper = form.openInModal();

    form.hide();
    expect(wrapper.classList.contains('dl-modal-hidden')).toBe(true);
    form.show();
    expect(wrapper.classList.contains('dl-modal-hidden')).toBe(false);
  });
});

describe('tab strip', () => {
  it('renders .dl-tab-btn siblings that can be walked and clicked', async () => {
    const form = await makeForm({
      fields: [
        { name: 'a', tab: 'Find Citation' },
        { name: 'b', tab: 'Add Citation' },
      ],
      onCancel: () => {},
    });

    const modal = form.openInModal();
    const wrapper = modal.querySelector('.tabWrapper')!;
    const first = wrapper.querySelector('.dl-tab-btn.FindCitation')!;
    const second = wrapper.querySelector('.dl-tab-btn.AddCitation')!;

    // monsterwriter's export wizard navigates with nextSibling/previousSibling.
    expect(first.nextSibling).toBe(second);
    expect(second.previousSibling).toBe(first);
    expect(first.classList.contains('active')).toBe(true);

    (second as HTMLElement).click();
    expect(second.classList.contains('active')).toBe(true);
    expect(second.classList.contains('seen')).toBe(true);
  });

  it('toggles notInTab on the wrappers of fields outside the active tab', async () => {
    const form = await makeForm({
      fields: [
        { name: 'a', tab: 'One' },
        { name: 'b', tab: 'Two' },
      ],
      onCancel: () => {},
    });
    form.openInModal();

    expect(form.field('b')!.wrapper.classList.contains('notInTab')).toBe(true);
  });
});

describe('dl-select DOM', () => {
  it('exposes the name attribute and the options wrapper hook', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'template',
          kind: 'select',
          options: [{ value: 'a', label: 'Alpha' }],
        },
      ],
    });

    // structured-text-editor's e2e suite has ~193 selectors of this shape.
    expect(form.formElement.querySelector('dl-select[name="template"]')).not.toBeNull();

    const wrapper = form.field('template')!.element.querySelector('.options-wrapper')!;
    expect(wrapper.getAttribute('data-for-dl-select')).toBe('template');
    expect(wrapper.querySelector('dl-option[value="a"]')).not.toBeNull();
  });

  it('keeps the misspelled multiselect remove classes consumers style', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'tags',
          kind: 'select',
          multiple: true,
          options: [{ value: 'a', label: 'Alpha' }],
          defaultValue: ['a'],
        },
      ],
    });

    const el = form.field('tags')!.element;
    expect(el.querySelector('.multiselect-tag')).not.toBeNull();
    expect(el.querySelector('.dl-muliselect-selected-remove')).not.toBeNull();
    expect(el.querySelector('.dl-muliselect-selected-remove-container')).not.toBeNull();
  });

  it('renders option labels marked with html() as markup, keeping .dl-option-tag', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'template',
          kind: 'select',
          options: [
            {
              value: 'a',
              label: html('Formless <span class="dl-option-tag">Offline</span>'),
            },
          ],
        },
      ],
    });

    expect(form.field('template')!.element.querySelector('.dl-option-tag')?.textContent).toBe(
      'Offline',
    );
  });
});

describe('array field DOM', () => {
  it('renders the documented entry and suggestion structure', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'authors',
          kind: 'array',
          of: [{ name: 'preName' }],
          suggested: [{ preName: 'Ada' }],
          defaultValue: [{ preName: 'Grace' }],
        },
      ],
    });

    const el = form.field('authors')!.element;
    expect(el.querySelector('.dl-form-array-suggested-container')).not.toBeNull();
    expect(el.querySelector('.check.dl-form-array-of-suggestion')).not.toBeNull();
    expect(el.querySelector('.dl-form-array-of-entry')).not.toBeNull();
    expect(el.querySelector('.dl-form-array-of-entry .edit-array-of-btn')).not.toBeNull();
    expect(el.querySelector('.dl-form-array-of-entry .delete-array-of-btn')).not.toBeNull();
    expect(el.querySelector('.dl-form-array-of-add-entry')).not.toBeNull();
  });
});

describe('tooltip DOM', () => {
  it('renders the marker consumers select through the wrapper id', async () => {
    const form = await makeForm({
      fields: [{ name: 'url', displayName: 'URL', tooltip: 'Where from?' }],
    });
    document.body.appendChild(form.dom);

    // structured-text-editor's e2e helper uses exactly this selector.
    const marker = document.querySelector('#dl-form-field-wrapper-for-url .dl-tooltip')!;
    expect(marker.tagName).toBe('SPAN');
    expect(marker.getAttribute('data-tippy-content')).toBe('Where from?');
  });

  it.each(['tooltip-success', 'tooltip-warning', 'tooltip-error', 'tooltip-loading'])(
    'supports the %s state class',
    async (className) => {
      const form = await makeForm({
        fields: [{ name: 'a', displayName: 'A', tooltip: 'x' }],
      });

      const apply = {
        'tooltip-success': () => form.setTooltipSuccess('a', 'ok'),
        'tooltip-warning': () => form.setTooltipWarning('a', 'hmm'),
        'tooltip-error': () => form.setTooltipError('a', 'bad'),
        'tooltip-loading': () => form.setTooltipLoading('a', 'wait'),
      }[className]!;
      apply();

      expect(
        form.field('a')!.wrapper.querySelector('.dl-tooltip')!.classList.contains(className),
      ).toBe(true);
    },
  );
});

describe('inactive fields', () => {
  it('marks the wrapper rather than removing it', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', isActive: () => false }],
    });

    const wrapper = form.field('a')!.wrapper;
    expect(wrapper.classList.contains('inactive')).toBe(true);
    expect(wrapper.isConnected || wrapper.parentElement).toBeTruthy();
  });
});
