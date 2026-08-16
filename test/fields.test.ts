import { describe, expect, it, vi } from 'vitest';
import { makeForm, type } from './helpers.js';
import { html } from '../src/util/html.js';

describe('text field', () => {
  it('is the kind you get when none is given', async () => {
    const form = await makeForm({ fields: [{ name: 'title' }] });
    expect(form.field('title')?.element.tagName).toBe('INPUT');
  });

  it('round-trips its value', async () => {
    const form = await makeForm({ fields: [{ name: 'title' }] });
    form.field('title')?.setValue('Hello');
    expect(form.getValues()['title']).toBe('Hello');
  });

  it('applies type, placeholder and autocomplete', async () => {
    const form = await makeForm({
      fields: [
        { name: 'pw', type: 'password', placeholder: 'Secret', autocomplete: 'off' },
      ],
    });

    const input = form.field('pw')?.element as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.placeholder).toBe('Secret');
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  it('recomputes a function placeholder on update', async () => {
    const form = await makeForm({
      fields: [
        { name: 'kind' },
        {
          name: 'locator',
          placeholder: ({ data }) => `enter a ${String(data['kind'] || 'page')}`,
        },
      ],
    });

    const input = form.field('locator')?.element as HTMLInputElement;
    expect(input.placeholder).toBe('enter a page');

    type(form.field('kind')!.element, 'chapter');
    await form.whenReady();
    expect(input.placeholder).toBe('enter a chapter');
  });
});

describe('value round-trips (regression: v1 lost falsy values)', () => {
  it.each([
    ['empty string', ''],
    ['zero', 0],
    ['false', false],
  ])('preserves %s through getValues', async (_label, value) => {
    const form = await makeForm({ fields: [{ name: 'v' }] });
    form.field('v')?.setValue(value);

    // v1 read `getAttribute('data-value') || getAttribute('value') || _value ||
    // value`, so every falsy value fell through to the next source.
    expect(form.getValues()['v']).toBe(String(value));
  });

  it("keeps a computed field's falsy value with its original type", async () => {
    const form = await makeForm({
      fields: [{ name: 'count', kind: 'computed', compute: () => 0 }],
    });

    await form.updateComputedFields();
    expect(form.getValues()['count']).toBe(0);
  });

  it('keeps an unchecked checkbox as boolean false, not the string "false"', async () => {
    const form = await makeForm({
      fields: [{ name: 'agree', kind: 'checkbox', label: 'Agree' }],
    });
    expect(form.getValues()['agree']).toBe(false);
  });
});

describe('textarea field', () => {
  it('renders a textarea and round-trips its value', async () => {
    const form = await makeForm({
      fields: [{ name: 'note', kind: 'textarea' }],
    });

    const el = form.field('note')?.element as HTMLTextAreaElement;
    expect(el.tagName).toBe('TEXTAREA');

    type(el, 'line one');
    expect(form.getValues()['note']).toBe('line one');
  });
});

describe('checkbox field', () => {
  it('renders input and caption inside span.check', async () => {
    const form = await makeForm({
      fields: [{ name: 'agree', kind: 'checkbox', label: 'I agree' }],
    });

    const el = form.field('agree')!.element;
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('check');
    expect(el.querySelector('input')?.getAttribute('type')).toBe('checkbox');
    expect(el.querySelector('label')?.textContent).toBe('I agree');
  });

  it('associates its caption label with the input', async () => {
    const form = await makeForm({
      fields: [{ name: 'agree', kind: 'checkbox', label: 'I agree' }],
    });

    const el = form.field('agree')!.element;
    const input = el.querySelector('input')!;
    expect(el.querySelector('label')?.getAttribute('for')).toBe(input.id);
    expect(input.id).not.toBe('');
  });

  it('renders a caption containing markup only when marked with html()', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'a',
          kind: 'checkbox',
          label: html('I accept the <a href="#">terms</a>'),
        },
        { name: 'b', kind: 'checkbox', label: 'plain <b>text</b>' },
      ],
    });

    expect(form.field('a')!.element.querySelector('a')).not.toBeNull();
    expect(form.field('b')!.element.querySelector('b')).toBeNull();
  });

  it('reports true once checked', async () => {
    const form = await makeForm({
      fields: [{ name: 'agree', kind: 'checkbox', label: 'Agree' }],
    });

    const input = form.field('agree')!.element.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));

    expect(form.getValues()['agree']).toBe(true);
  });

  it('accepts a boolean default value', async () => {
    const form = await makeForm({
      fields: [{ name: 'agree', kind: 'checkbox', label: 'Agree', defaultValue: true }],
    });
    expect(form.getValues()['agree']).toBe(true);
  });
});

describe('message field', () => {
  it('renders a paragraph and holds no value', async () => {
    const form = await makeForm({
      fields: [{ name: 'info', kind: 'message', message: 'Heads up' }],
    });

    const el = form.field('info')!.element;
    expect(el.tagName).toBe('P');
    expect(el.className).toBe('message');
    expect(el.textContent).toBe('Heads up');
    expect('info' in form.getValues()).toBe(false);
  });

  it('accepts a function message and re-renders it on update', async () => {
    const form = await makeForm({
      fields: [
        { name: 'name' },
        {
          name: 'info',
          kind: 'message',
          message: ({ data }) => `Hello ${String(data['name'] || 'stranger')}`,
        },
      ],
    });

    expect(form.field('info')!.element.textContent).toBe('Hello stranger');

    type(form.field('name')!.element, 'Ada');
    await form.whenReady();
    expect(form.field('info')!.element.textContent).toBe('Hello Ada');
  });
});

describe('computed field', () => {
  it('renders a hidden input and marks the wrapper', async () => {
    const form = await makeForm({
      fields: [{ name: 'id', kind: 'computed', compute: () => 'x' }],
    });

    const field = form.field('id')!;
    expect((field.element as HTMLInputElement).type).toBe('hidden');
    expect(field.wrapper.className).toContain('dl-form-hidden-field');
  });

  it('derives its value from the other fields', async () => {
    const form = await makeForm({
      fields: [
        { name: 'email', defaultValue: 'ada@example.com' },
        {
          name: 'domain',
          kind: 'computed',
          compute: ({ data }) => String(data['email']).split('@')[1],
        },
      ],
    });

    await form.updateComputedFields();
    expect(form.getValues()['domain']).toBe('example.com');
  });

  it('awaits an async compute', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'id',
          kind: 'computed',
          compute: async () => {
            await new Promise((r) => setTimeout(r, 5));
            return 42;
          },
        },
      ],
    });

    await form.updateComputedFields();
    expect(form.getValues()['id']).toBe(42);
  });
});

describe('cards field', () => {
  it('renders one .detailed-option per card', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'plan',
          kind: 'cards',
          cards: [
            { value: 'free', content: 'Free' },
            { value: 'pro', content: 'Pro' },
          ],
        },
      ],
    });

    const el = form.field('plan')!.element;
    expect(el.className).toBe('detailed-options');
    expect(el.querySelectorAll('.detailed-option')).toHaveLength(2);
  });

  it('marks the clicked card active and reports its value', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'plan',
          kind: 'cards',
          cards: [
            { value: 'free', content: 'Free' },
            { value: 'pro', content: 'Pro' },
          ],
        },
      ],
    });

    const cards = form.field('plan')!.element.querySelectorAll('.detailed-option');
    (cards[1] as HTMLElement).click();

    expect(form.getValues()['plan']).toBe('pro');
    expect(cards[1]?.className).toContain('active');
    expect(cards[0]?.className).not.toContain('active');
  });

  it('ignores a value that matches no card', async () => {
    const form = await makeForm({
      fields: [
        { name: 'plan', kind: 'cards', cards: [{ value: 'free', content: 'Free' }] },
      ],
    });

    form.field('plan')?.setValue('nope');
    expect(form.getValues()['plan']).toBe('');
  });
});

describe('custom field', () => {
  it('renders into the provided element and can set a value', async () => {
    const form = await makeForm({
      fields: [
        {
          name: 'picker',
          kind: 'custom',
          render: (ctx) => {
            ctx.element.replaceChildren();
            const button = document.createElement('button');
            button.textContent = 'pick';
            button.onclick = () => ctx.setValue('picked');
            ctx.element.appendChild(button);
          },
        },
      ],
    });

    const el = form.field('picker')!.element;
    expect(el.className).toBe('render');

    (el.querySelector('button') as HTMLElement).click();
    await form.whenReady();
    expect(form.getValues()['picker']).toBe('picked');
  });

  it('re-renders with fresh form data on every update', async () => {
    const seen: string[] = [];
    const form = await makeForm({
      fields: [
        { name: 'name' },
        {
          name: 'echo',
          kind: 'custom',
          render: (ctx) => seen.push(String(ctx.data['name'] ?? '')),
        },
      ],
    });

    type(form.field('name')!.element, 'Ada');
    await form.whenReady();
    expect(seen).toContain('Ada');
  });
});

describe('file field', () => {
  it('renders the preview before the input', async () => {
    const form = await makeForm({
      fields: [{ name: 'cover', kind: 'file', accept: 'image/png' }],
      persistFile: async () => 'https://cdn.example.com/x.png',
    });

    const el = form.field('cover')!.element;
    expect(el.className).toBe('file-field');
    expect(el.children[0]?.className).toBe('file-preview empty');
    expect((el.children[1] as HTMLInputElement).getAttribute('accept')).toBe('image/png');
  });

  it('shows a preview with a remove button once a URL is set', async () => {
    const form = await makeForm({
      fields: [{ name: 'cover', kind: 'file' }],
      persistFile: async () => 'x',
    });

    form.field('cover')?.setValue('https://cdn.example.com/x.png');

    const el = form.field('cover')!.element;
    expect(el.getAttribute('data-value')).toBe('https://cdn.example.com/x.png');
    expect(el.querySelector('.file-selection-delete-btn-icon')).not.toBeNull();
    expect(form.getValues()['cover']).toBe('https://cdn.example.com/x.png');
  });

  it('clears back to the empty state', async () => {
    const form = await makeForm({
      fields: [{ name: 'cover', kind: 'file' }],
      persistFile: async () => 'x',
    });

    form.field('cover')?.setValue('https://cdn.example.com/x.png');
    (
      form
        .field('cover')!
        .element.querySelector('.file-selection-delete-btn') as HTMLElement
    ).click();
    await form.whenReady();

    expect(form.getValues()['cover']).toBe('');
    expect(
      form.field('cover')!.element.querySelector('.file-preview')?.className,
    ).toContain('empty');
  });

  it('explains itself when no persistFile handler is configured', async () => {
    const form = await makeForm({ fields: [{ name: 'cover', kind: 'file' }] });
    const field = form.field('cover')!;

    await expect(
      // Reach past the input, which cannot be populated programmatically.
      (
        field as unknown as { context: { persistFile(f: File): Promise<string> } }
      ).context.persistFile(new File([''], 'x.png')),
    ).rejects.toThrow(/needs a `persistFile` handler/);
  });
});

describe('field wrapper (frozen DOM contract)', () => {
  it('gives the wrapper the id consumers select on', async () => {
    const form = await makeForm({ fields: [{ name: 'citeKey' }] });
    expect(form.field('citeKey')!.wrapper.id).toBe('dl-form-field-wrapper-for-citeKey');
  });

  it('marks a field without a label', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }] });
    expect(form.field('a')!.wrapper.className).toContain('withoutLabel');
  });

  it('associates the label with the control (regression: v1 label[for] hit nothing)', async () => {
    const form = await makeForm({
      fields: [{ name: 'title', displayName: 'Title' }],
    });

    const field = form.field('title')!;
    const label = field.wrapper.querySelector('label')!;

    expect(label.getAttribute('for')).toBe(field.element.id);
    expect(field.element.id).not.toBe('');
    expect(field.wrapper.querySelector(`#${label.getAttribute('for')}`)).toBe(
      field.element,
    );
  });

  it('adds className entries to the wrapper', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', className: 'dl-field-one-third left-side' }],
    });

    const { className } = form.field('a')!.wrapper;
    expect(className).toContain('dl-field-one-third');
    expect(className).toContain('left-side');
  });

  it('sets both the name property and attribute on the control', async () => {
    const form = await makeForm({ fields: [{ name: 'title' }] });
    const el = form.field('title')!.element as HTMLInputElement;
    expect(el.name).toBe('title');
    expect(el.getAttribute('name')).toBe('title');
  });

  it('rejects duplicate field names', async () => {
    await expect(makeForm({ fields: [{ name: 'a' }, { name: 'a' }] })).rejects.toThrow(
      /duplicate field name "a"/,
    );
  });
});

describe('tooltips', () => {
  it('puts the marker inside the label by default', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', displayName: 'A', tooltip: 'Some help' }],
    });

    const label = form.field('a')!.wrapper.querySelector('label')!;
    expect(label.querySelector('.dl-tooltip')?.textContent).toBe('?');
  });

  it('puts the marker in the wrapper when inInput is set', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', displayName: 'A', tooltip: { text: 'Help', inInput: true } }],
    });

    const field = form.field('a')!;
    expect(field.wrapper.querySelector('label .dl-tooltip')).toBeNull();
    expect(field.wrapper.querySelector('.dl-tooltip.dl-tooltip-in-input')).not.toBeNull();
    expect(field.element.className).toContain('dl-tooltip-inside');
  });

  it('applies and resets state classes', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', displayName: 'A', tooltip: 'Original' }],
    });

    const marker = form.field('a')!.wrapper.querySelector('.dl-tooltip')!;

    form.setTooltipError('a', 'Broken');
    expect(marker.className).toBe('dl-tooltip tooltip-error');
    expect(marker.getAttribute('data-tippy-content')).toBe('Broken');

    form.setTooltipSuccess('a', 'Fine');
    expect(marker.className).toBe('dl-tooltip tooltip-success');

    form.resetTooltip('a');
    expect(marker.className).toBe('dl-tooltip');
    expect(marker.getAttribute('data-tippy-content')).toBe('Original');
    expect(marker.textContent).toBe('?');
  });

  it('keeps the in-input class when the state changes', async () => {
    const form = await makeForm({
      fields: [{ name: 'a', displayName: 'A', tooltip: { text: 'Help', inInput: true } }],
    });

    form.setTooltipWarning('a', 'Careful');
    const marker = form.field('a')!.wrapper.querySelector('.dl-tooltip')!;
    expect(marker.className).toBe('dl-tooltip dl-tooltip-in-input tooltip-warning');
  });

  it('is a silent no-op for a field with no tooltip', async () => {
    const form = await makeForm({ fields: [{ name: 'a' }] });
    expect(() => form.setTooltipError('a', 'x')).not.toThrow();
    expect(() => form.resetTooltips(['a', 'missing'])).not.toThrow();
  });

  it('does not reach into another form with the same field name', async () => {
    const a = await makeForm({
      fields: [{ name: 'shared', displayName: 'A', tooltip: 'A tip' }],
    });
    const b = await makeForm({
      fields: [{ name: 'shared', displayName: 'B', tooltip: 'B tip' }],
    });

    document.body.append(a.dom, b.dom);
    a.setTooltipError('shared', 'only A');

    // v1 used document.querySelector here, so this hit whichever form was first.
    expect(b.field('shared')!.wrapper.querySelector('.dl-tooltip')!.className).toBe(
      'dl-tooltip',
    );
  });

  it('uses a custom tooltip provider when given', async () => {
    const attach = vi.fn();
    await makeForm({
      fields: [{ name: 'a', displayName: 'A', tooltip: 'Help' }],
      tooltipProvider: { attach, detach: vi.fn() },
    });

    expect(attach).toHaveBeenCalledWith(expect.any(Object), 'Help');
  });
});
