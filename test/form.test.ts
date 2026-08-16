import { describe, expect, it, vi } from 'vitest';
import { DeclarativeForm } from '../src/core/DeclarativeForm.js';
import { ModalStack } from '../src/ui/ModalStack.js';
import { click, flush, makeForm, press, trackForm, type } from './helpers.js';

describe('values', () => {
  it('keys values by field name', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }, { name: 'b' }] });
    expect(form.getValues()).toEqual({ a: '', b: '', activeTab: undefined });
  });

  it('applies a literal default value', async () => {
    const form = await makeForm({
      fields: [
        { name: 'lang', kind: 'select', options: ['en', 'de'], defaultValue: 'de' },
      ],
    });
    expect(form.getValues()['lang']).toBe('de');
  });

  it('applies a default value computed from the form context', async () => {
    const form = await makeForm({
      fields: [{ name: 'year', defaultValue: () => '2026' }],
    });
    expect(form.getValues()['year']).toBe('2026');
  });

  it('resolves an async options function before applying the default', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'lang',
          kind: 'select',
          options: async () => [
            { value: 'en', label: 'English' },
            { value: 'fr', label: 'French' },
          ],
          defaultValue: 'fr',
        },
      ],
    });
    expect(form.getValues()['lang']).toBe('fr');
  });

  it('notifies input subscribers when values change', async () => {
    const seen: unknown[] = [];
    const form = await makeForm({ fields: [{ name: 'a' }] });
    form.subscribeOnInput((values) => seen.push(values['a']));

    type(form.field('a')!.element, 'hello');
    await form.whenReady();

    expect(seen).toContain('hello');
  });
});

describe('isActive', () => {
  it('hides the field and drops it from getValues', async () => {
    const form = await makeForm({
      fields: [
        { name: 'kind', defaultValue: 'simple' },
        { name: 'detail', isActive: ({ data }) => data['kind'] === 'advanced' },
      ],
    });

    expect(form.field('detail')!.wrapper.className).toContain('inactive');
    expect('detail' in form.getValues()).toBe(false);
  });

  it('re-evaluates on every update', async () => {
    const form = await makeForm({
      fields: [
        { name: 'kind', defaultValue: 'simple' },
        { name: 'detail', isActive: ({ data }) => data['kind'] === 'advanced' },
      ],
    });

    type(form.field('kind')!.element, 'advanced');
    await form.whenReady();

    expect(form.field('detail')!.wrapper.className).not.toContain('inactive');
    expect('detail' in form.getValues()).toBe(true);
  });

  it('sees the values of the enclosing modal stack', async () => {
    const stack = new ModalStack();
    const outer = trackForm(
      new DeclarativeForm(
        { fields: [{ name: 'outer', defaultValue: 'yes' }], onCancel: () => {} },
        { stack },
      ),
    );
    await outer.whenReady();
    outer.openInModal();

    const seen: unknown[] = [];
    const inner = trackForm(
      new DeclarativeForm(
        {
          fields: [
            {
              name: 'inner',
              isActive: ({ stackData }) => {
                seen.push(stackData);
                return true;
              },
            },
          ],
        },
        { stack },
      ),
    );
    await inner.whenReady();
    inner.openInModal();
    await inner.whenReady();

    expect(seen.at(-1)).toEqual(
      expect.arrayContaining([expect.objectContaining({ outer: 'yes' })]),
    );
  });
});

describe('tabs', () => {
  it('renders a button per tab, in field declaration order', async () => {
    const form = await makeForm({
      fields: [
        { name: 'a', tab: 'General Settings' },
        { name: 'b', tab: 'Special' },
        { name: 'c', tab: 'General Settings' },
      ],
      onCancel: () => {},
    });

    const modal = form.openInModal();
    const tabs = [...modal.querySelectorAll('.dl-tab-btn')];
    expect(tabs.map((t) => t.textContent)).toEqual(['General Settings', 'Special']);
  });

  it("shows only the active tab's fields", async () => {
    const form = await makeForm({
      fields: [
        { name: 'a', tab: 'One' },
        { name: 'b', tab: 'Two' },
      ],
      onCancel: () => {},
    });
    form.openInModal();

    expect(form.field('a')!.wrapper.className).not.toContain('notInTab');
    expect(form.field('b')!.wrapper.className).toContain('notInTab');

    form.setActiveTab('Two');
    expect(form.field('b')!.wrapper.className).not.toContain('notInTab');
  });

  it('reports the active tab in getValues', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', tab: 'One' }],
      onCancel: () => {},
    });
    form.openInModal();
    expect(form.getValues()['activeTab']).toBe('One');
  });

  it('omits a tab whose fields are all inactive', async () => {
    const form = await makeForm({
      fields: [
        { name: 'a', tab: 'Always' },
        { name: 'b', tab: 'Sometimes', isActive: () => false },
      ],
      onCancel: () => {},
    });

    const modal = form.openInModal();
    await form.whenReady();

    const labels = [...modal.querySelectorAll('.dl-tab-btn')].map((t) => t.textContent);
    expect(labels).toEqual(['Always']);
  });

  it('lets a field belong to several tabs', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', tab: ['One', 'Two'] }],
      onCancel: () => {},
    });
    form.openInModal();

    form.setActiveTab('Two');
    expect(form.field('a')!.wrapper.className).not.toContain('notInTab');
  });

  it('accepts a tab computed from the form context', async () => {
    const form = await makeForm({
      fields: [
        { name: 'mode', defaultValue: 'edit' },
        { name: 'a', tab: ({ data }) => (data['mode'] === 'edit' ? 'Edit' : 'View') },
      ],
      onCancel: () => {},
    });

    const modal = form.openInModal();
    await form.whenReady();
    expect(modal.querySelector('.dl-tab-btn')?.textContent).toBe('Edit');
  });

  it('re-syncs when setActiveTab is called with no argument', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', tab: 'One' }],
      onCancel: () => {},
    });
    form.openInModal();

    expect(() => form.setActiveTab()).not.toThrow();
    expect(form.getValues()['activeTab']).toBe('One');
  });
});

describe('buttons', () => {
  it('renders a single OK button by default', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    const modal = form.openInModal();

    const buttons = modal.querySelectorAll('.low-bar .btn');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe('OK');
  });

  it('uses confirmLabel for the default button', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }],
      confirmLabel: 'Back to References',
    });
    expect(form.openInModal().querySelector('.btn')?.textContent).toBe(
      'Back to References',
    );
  });

  it('renders custom buttons keyed by label and runs their action', async () => {
    const action = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'note', defaultValue: 'A text' }],
      buttons: { 'Save & Export': { action } },
    });

    const modal = form.openInModal();
    click(modal.querySelector('.btn'));
    await flush();

    expect(action).toHaveBeenCalledWith(expect.objectContaining({ note: 'A text' }));
  });

  it('applies id and class to the button element', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: { Cancel: { id: 'cancelBtn', class: 'secondary', action: () => {} } },
    });

    const button = form.openInModal().querySelector('#cancelBtn')!;
    expect(button.className).toContain('btn');
    expect(button.className).toContain('secondary');
  });

  it('renders buttons as real <button> elements', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    const button = form.openInModal().querySelector('.low-bar .btn')!;

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('disables a button whose isActive predicate is false', async () => {
    const form = await makeForm({
      fields: [{ name: 'email' }],
      buttons: {
        Invite: {
          id: 'inviteBtn',
          isActive: ({ data }) => String(data['email']).includes('@'),
          action: () => {},
        },
      },
    });
    form.openInModal();
    await form.whenReady();

    const button = document.getElementById('inviteBtn')!;
    expect(button.className).toContain('disabled');

    type(form.field('email')!.element, 'ada@example.com');
    await form.whenReady();
    expect(button.className).not.toContain('disabled');
  });

  it('awaits an async isActive', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', defaultValue: 'x' }],
      buttons: {
        Go: { id: 'goBtn', isActive: async () => true, action: () => {} },
      },
    });
    form.openInModal();
    await form.whenReady();

    expect(document.getElementById('goBtn')?.className).not.toContain('disabled');
  });

  it('hides a button whose isVisible predicate is false', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: {
        Upgrade: { id: 'upgradeBtn', isVisible: () => false, action: () => {} },
      },
    });
    form.openInModal();
    await form.whenReady();

    expect(document.getElementById('upgradeBtn')?.className).toContain('invisible');
  });

  it('skips state management for a button with no id, as v1 did', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: { Go: { isActive: () => false, action: () => {} } },
    });
    const modal = form.openInModal();
    await form.whenReady();

    expect(modal.querySelector('.btn')?.className).not.toContain('disabled');
  });

  it('keeps the dialog open for doNotCloseModal', async () => {
    const action = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: { Next: { id: 'nextBtn', doNotCloseModal: true, action } },
    });

    const modal = form.openInModal();
    click(modal.querySelector('#nextBtn'));
    await flush();

    expect(action).toHaveBeenCalled();
    expect(modal.isConnected).toBe(true);
  });

  it('recomputes computed fields before the action runs', async () => {
    let received: unknown;
    const form = await makeForm({
      fields: [
        { name: 'email', defaultValue: 'ada@example.com' },
        {
          name: 'domain',
          kind: 'computed',
          compute: ({ data }) => String(data['email']).split('@')[1],
        },
      ],
      buttons: { OK: { action: (values) => void (received = values['domain']) } },
    });

    click(form.openInModal().querySelector('.btn'));
    await flush();

    expect(received).toBe('example.com');
  });

  it('does not delete the button while showing its loading state', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: {
        Slow: {
          id: 'slowBtn',
          doNotCloseModal: true,
          action: () => new Promise((r) => setTimeout(r, 5)),
        },
      },
    });

    const modal = form.openInModal();
    const button = modal.querySelector('#slowBtn') as HTMLElement;
    button.click();

    expect(button.className).toContain('loading-btn');
    await flush();
    await new Promise((r) => setTimeout(r, 20));

    // v1 called `.remove('loading-btn')` — Element.remove() — deleting the button.
    expect(button.isConnected).toBe(true);
    expect(button.className).not.toContain('loading-btn');
  });

  it('ignores clicks on a disabled button', async () => {
    const action = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: { Go: { id: 'goBtn', isActive: () => false, action } },
    });

    const modal = form.openInModal();
    await form.whenReady();
    click(modal.querySelector('#goBtn'));
    await flush();

    expect(action).not.toHaveBeenCalled();
  });
});

describe('modal lifecycle', () => {
  it('returns the outer .dl-modal element from openInModal', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    const modal = form.openInModal();

    // Frozen: monsterwriter stores this and probes it for a close() method.
    expect(modal.tagName).toBe('DIV');
    expect(modal.className).toBe('dl-modal');
    expect(modal.parentElement).toBe(document.body);
  });

  it('renders the documented chrome structure', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onCancel: () => {} });
    const modal = form.openInModal();

    const inner = modal.querySelector('.modal')!;
    expect([...inner.children].map((c) => c.className)).toEqual([
      'up-bar',
      'tabWrapper',
      'modal-content',
      'low-bar',
    ]);
    expect(inner.querySelector('.modal-content > .dl-form > form')).not.toBeNull();
  });

  it('omits the up-bar class when the dialog cannot be dismissed', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    const inner = form.openInModal().querySelector('.modal')!;

    expect(inner.children[0]?.className).toBe('');
    expect(inner.querySelector('.cancelBtn')).toBeNull();
  });

  it('runs onConfirm and removes the dialog when closed', async () => {
    const onConfirm = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'a', defaultValue: 'x' }],
      onConfirm,
    });

    const modal = form.openInModal();
    await form.close();

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ a: 'x' }));
    expect(modal.isConnected).toBe(false);
  });

  it('closes on the cancel button when onCancel is given', async () => {
    const onCancel = vi.fn();
    const form = await makeForm({ fields: [{ name: 'a' }], onCancel });

    const modal = form.openInModal();
    click(modal.querySelector('.cancelBtn'));

    expect(onCancel).toHaveBeenCalled();
    expect(modal.isConnected).toBe(false);
  });

  it('closes on Escape', async () => {
    const onCancel = vi.fn();
    const form = await makeForm({ fields: [{ name: 'a' }], onCancel });
    form.openInModal();

    press(document, 'Escape');
    expect(onCancel).toHaveBeenCalled();
  });

  it('ignores Escape when the dialog has no onCancel', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    const modal = form.openInModal();

    press(document, 'Escape');
    expect(modal.isConnected).toBe(true);
  });

  it('reuses one modal element across repeated opens', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });

    const first = form.openInModal();
    const second = form.openInModal();

    expect(second).toBe(first);
    expect(document.querySelectorAll('.dl-modal')).toHaveLength(1);
  });

  it('embeds inline with appendInElement and survives close', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    form.appendInElement(host);

    const modal = host.querySelector('.dl-modal')!;
    expect(modal.className).toContain('noModalDialog');
    expect(modal.querySelector('.dl-form')).not.toBeNull();

    await form.close();
    expect(modal.isConnected).toBe(true);
  });

  it('adds classNames to .modal and wrapperClassNames to .dl-modal', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm: () => {} });
    const modal = form.openInModal({
      classNames: ['largeModal'],
      wrapperClassNames: ['reactModalContainer'],
    });

    expect(modal.className).toContain('reactModalContainer');
    expect(modal.querySelector('.modal')?.className).toContain('largeModal');
  });

  it('adds form classNames to the <form> element', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }],
      classNames: ['className1', 'className2'],
    });

    expect(form.formElement.className).toBe('className1 className2');
    expect(form.formElement.getAttribute('autocomplete')).toBe('off');
  });
});

describe('modal stacking', () => {
  it('hides the covered dialog and restores it on close', async () => {
    const stack = new ModalStack();
    const outer = trackForm(
      new DeclarativeForm({ fields: [{ name: 'a' }], onCancel: () => {} }, { stack }),
    );
    const inner = trackForm(
      new DeclarativeForm({ fields: [{ name: 'b' }], onCancel: () => {} }, { stack }),
    );
    await Promise.all([outer.whenReady(), inner.whenReady()]);

    const outerModal = outer.openInModal();
    inner.openInModal();
    expect(outerModal.className).toContain('dl-modal-hidden');

    inner.cancel();
    expect(outerModal.className).not.toContain('dl-modal-hidden');
  });

  it('routes Escape to the topmost dialog only', async () => {
    const stack = new ModalStack();
    const outerCancel = vi.fn();
    const innerCancel = vi.fn();

    const outer = trackForm(
      new DeclarativeForm({ fields: [{ name: 'a' }], onCancel: outerCancel }, { stack }),
    );
    const inner = trackForm(
      new DeclarativeForm({ fields: [{ name: 'b' }], onCancel: innerCancel }, { stack }),
    );
    await Promise.all([outer.whenReady(), inner.whenReady()]);

    outer.openInModal();
    inner.openInModal();
    press(document, 'Escape');

    expect(innerCancel).toHaveBeenCalled();
    expect(outerCancel).not.toHaveBeenCalled();
  });

  it('attaches no key listener until a dialog opens', async () => {
    const stack = new ModalStack();
    const spy = vi.spyOn(document, 'addEventListener');

    const form = trackForm(
      new DeclarativeForm({ fields: [{ name: 'a' }], onCancel: () => {} }, { stack }),
    );
    await form.whenReady();
    expect(spy).not.toHaveBeenCalledWith('keydown', expect.anything());

    form.openInModal();
    expect(spy).toHaveBeenCalledWith('keydown', expect.anything());
    spy.mockRestore();
  });

  it('detaches the key listener once the last dialog closes', async () => {
    const stack = new ModalStack();
    const form = trackForm(
      new DeclarativeForm({ fields: [{ name: 'a' }], onCancel: () => {} }, { stack }),
    );
    await form.whenReady();

    const spy = vi.spyOn(document, 'removeEventListener');
    form.openInModal();
    form.cancel();

    expect(spy).toHaveBeenCalledWith('keydown', expect.anything());
    spy.mockRestore();
  });
});

describe('Enter key', () => {
  it('confirms a single-button dialog', async () => {
    const onConfirm = vi.fn();
    const form = await makeForm({ fields: [{ name: 'a' }], onConfirm });
    form.openInModal();

    press(form.field('a')!.element, 'Enter');
    await flush();

    expect(onConfirm).toHaveBeenCalled();
  });

  it('does nothing in a dialog with several buttons', async () => {
    const save = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: { Save: { action: save }, Export: { action: vi.fn() } },
    });
    form.openInModal();

    press(form.field('a')!.element, 'Enter');
    await flush();

    expect(save).not.toHaveBeenCalled();
  });

  it('inserts a newline in a textarea that allows them', async () => {
    const onConfirm = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'note', kind: 'textarea', allowNewlines: true }],
      onConfirm,
    });
    form.openInModal();

    const event = press(form.field('note')!.element, 'Enter');
    await flush();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('suppresses the newline but does not confirm when allowNewlines is false', async () => {
    const onConfirm = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'note', kind: 'textarea' }],
      onConfirm,
    });
    form.openInModal();

    const event = press(form.field('note')!.element, 'Enter');
    await flush();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not confirm while the button is disabled', async () => {
    const action = vi.fn();
    const form = await makeForm({
      fields: [{ name: 'a' }],
      buttons: { OK: { id: 'okBtn', isActive: () => false, action } },
    });
    form.openInModal();
    await form.whenReady();

    press(form.field('a')!.element, 'Enter');
    await flush();

    expect(action).not.toHaveBeenCalled();
  });
});

describe('reloadOnChangeOf', () => {
  it('reloads options when a declared dependency changes', async () => {
    const load = vi.fn(async ({ data }: { data: Record<string, unknown> }) => [
      { value: '1', label: `for ${String(data['owner'])}` },
    ]);

    const form = await makeForm({
      fields: [
        { name: 'owner', defaultValue: 'ada' },
        { name: 'repo', kind: 'select', options: load, reloadOnChangeOf: ['owner'] },
      ],
    });

    const before = load.mock.calls.length;
    type(form.field('owner')!.element, 'linus');
    await form.whenReady();

    expect(load.mock.calls.length).toBeGreaterThan(before);
    expect(form.field('repo')!.element.textContent).toContain('for linus');
  });

  it('does not reload for a field it does not depend on', async () => {
    const load = vi.fn(async () => [{ value: '1', label: 'One' }]);
    const form = await makeForm({
      fields: [
        { name: 'owner' },
        { name: 'other' },
        { name: 'repo', kind: 'select', options: load, reloadOnChangeOf: ['owner'] },
      ],
    });

    const before = load.mock.calls.length;
    type(form.field('other')!.element, 'x');
    await form.whenReady();

    expect(load.mock.calls.length).toBe(before);
  });

  it('discards a stale options response (regression: v1 had no guard)', async () => {
    const delays: Record<string, number> = { slow: 40, fast: 1 };

    const form = await makeForm({
      fields: [
        { name: 'owner', defaultValue: 'init' },
        {
          name: 'repo',
          kind: 'select',
          reloadOnChangeOf: ['owner'],
          options: async ({ data }) => {
            const owner = String(data['owner']);
            await new Promise((r) => setTimeout(r, delays[owner] ?? 0));
            return [{ value: owner, label: `repo-of-${owner}` }];
          },
        },
      ],
    });

    type(form.field('owner')!.element, 'slow');
    await new Promise((r) => setTimeout(r, 5));
    type(form.field('owner')!.element, 'fast');

    await form.whenReady();
    await new Promise((r) => setTimeout(r, 80));

    const rendered = form.field('repo')!.element.textContent ?? '';
    expect(rendered).toContain('repo-of-fast');
    expect(rendered).not.toContain('repo-of-slow');
  });

  it('surfaces an options failure through onOptionsError', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'repo',
          displayName: 'Repo',
          tooltip: 'Pick a repo',
          kind: 'select',
          options: async () => {
            throw new Error('offline');
          },
          onOptionsError: ({ error }) => ({
            level: 'error',
            text: `Failed: ${(error as Error).message}`,
          }),
        },
      ],
    });

    const marker = form.field('repo')!.wrapper.querySelector('.dl-tooltip')!;
    expect(marker.className).toContain('tooltip-error');
    expect(marker.getAttribute('data-tippy-content')).toBe('Failed: offline');
  });
});

describe('onFormChange', () => {
  it('receives the current data and the triggering field', async () => {
    const calls: { value: unknown; trigger: string | undefined }[] = [];

    const form = await makeForm({
      fields: [
        { name: 'a' },
        {
          name: 'b',
          onFormChange: (ctx) => {
            calls.push({ value: ctx.data['a'], trigger: ctx.trigger?.name });
          },
        },
      ],
    });

    type(form.field('a')!.element, 'typed');
    await form.whenReady();

    expect(calls.at(-1)).toEqual({ value: 'typed', trigger: 'a' });
  });
});

describe('field handle', () => {
  it('exposes the control, wrapper and value accessors', async () => {
    const form = await makeForm({
      fields: [{ name: 'lang', kind: 'select', options: ['en', 'de'] }],
    });

    const field = form.field('lang')!;
    expect(field.name).toBe('lang');
    expect(field.element.tagName).toBe('DL-SELECT');
    expect(field.wrapper.className).toContain('dl-select-wrapper');

    field.setValue('de');
    expect(field.getValue()).toBe('de');
  });

  it('returns undefined for an unknown field', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }] });
    expect(form.field('nope')).toBeUndefined();
  });

  it('drives the loading state', async () => {
    const form = await makeForm({
      fields: [{ name: 'lang', kind: 'select', options: ['en'] }],
    });

    expect(() => form.field('lang')!.setLoading(true)).not.toThrow();
    expect(() => form.field('lang')!.setLoading(false)).not.toThrow();
  });

  it('lists every field in declaration order', async () => {
    const form = await makeForm({
      fields: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    });
    expect(form.fields.map((f) => f.name)).toEqual(['a', 'b', 'c']);
  });
});
