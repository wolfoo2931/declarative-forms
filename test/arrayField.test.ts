import { describe, expect, it, vi } from 'vitest';
import { click, flush, makeForm, type } from './helpers.js';
import type { DeclarativeForm } from '../src/core/DeclarativeForm.js';
import type { FormValues } from '../src/types/descriptors.js';

const authorFields = [
  { name: 'preName', displayName: 'First Name' },
  { name: 'lastName', displayName: 'Last Name' },
];

async function makeAuthorsForm(
  extra: Partial<Parameters<typeof makeForm>[0]> = {},
  fieldExtra: Record<string, unknown> = {},
): Promise<DeclarativeForm> {
  return makeForm({
    fields: [
      {
        name: 'authors',
        kind: 'array',
        of: authorFields,
        newButtonLabel: 'Add Author',
        ...fieldExtra,
      },
    ],
    ...extra,
  });
}

/** The nested entry dialog is the last `.dl-modal` added to the body. */
function entryDialog(): HTMLElement {
  const dialogs = document.querySelectorAll('.dl-modal');
  return dialogs[dialogs.length - 1] as HTMLElement;
}

async function addAuthor(form: DeclarativeForm, first: string, last: string) {
  click(form.field('authors')!.element.querySelector('.dl-form-array-of-add-entry'));
  await flush();

  const dialog = entryDialog();
  type(dialog.querySelector('[name=preName]') as HTMLElement, first);
  type(dialog.querySelector('[name=lastName]') as HTMLElement, last);

  click(dialog.querySelector('.low-bar .btn'));
  await flush();
}

describe('array field', () => {
  it('renders an add button with the configured label', async () => {
    const form = await makeAuthorsForm();
    const el = form.field('authors')!.element;

    expect(el.className).toBe('array-of');
    expect(el.querySelector('.dl-form-array-of-add-entry')?.textContent).toBe(
      'Add Author',
    );
  });

  it('starts with an empty array', async () => {
    const form = await makeAuthorsForm();
    expect(form.getValues()['authors']).toEqual([]);
  });

  it('opens a nested dialog scoped by a class naming the field', async () => {
    const form = await makeAuthorsForm();
    click(form.field('authors')!.element.querySelector('.dl-form-array-of-add-entry'));
    await flush();

    expect(entryDialog().querySelector('.form-for-array-of-authors')).not.toBeNull();
  });

  it('adds an entry and renders a summary row', async () => {
    const form = await makeAuthorsForm();
    await addAuthor(form, 'Ada', 'Lovelace');

    const rows = form.field('authors')!.element.querySelectorAll(
      '.dl-form-array-of-entry',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.querySelector('span')?.textContent).toBe('Ada, Lovelace');
    expect(form.getValues()['authors']).toEqual([
      expect.objectContaining({ preName: 'Ada', lastName: 'Lovelace' }),
    ]);
  });

  it('uses a custom renderEntry for the summary', async () => {
    const form = await makeAuthorsForm(
      {},
      {
        renderEntry: (entry: FormValues) =>
          `${String(entry['lastName'])}, ${String(entry['preName'])}`,
      },
    );
    await addAuthor(form, 'Ada', 'Lovelace');

    expect(
      form.field('authors')!.element.querySelector('.dl-form-array-of-entry span')
        ?.textContent,
    ).toBe('Lovelace, Ada');
  });

  it('renders edit and delete buttons carrying the entry index', async () => {
    const form = await makeAuthorsForm();
    await addAuthor(form, 'Ada', 'Lovelace');
    await addAuthor(form, 'Grace', 'Hopper');

    const rows = [
      ...form.field('authors')!.element.querySelectorAll('.dl-form-array-of-entry'),
    ];
    expect(rows.map((r) => r.getAttribute('data-el-index'))).toEqual(['0', '1']);
    expect(rows[1]?.querySelector('.edit-array-of-btn')?.textContent).toBe('Edit');
    expect(rows[1]?.querySelector('.delete-array-of-btn')?.textContent).toBe('Remove');
  });

  it('removes an entry', async () => {
    const form = await makeAuthorsForm();
    await addAuthor(form, 'Ada', 'Lovelace');
    await addAuthor(form, 'Grace', 'Hopper');

    click(form.field('authors')!.element.querySelector('.delete-array-of-btn'));
    await flush();

    expect(form.getValues()['authors']).toEqual([
      expect.objectContaining({ preName: 'Grace' }),
    ]);
  });

  it('edits an entry, seeding the dialog with its current values', async () => {
    const form = await makeAuthorsForm();
    await addAuthor(form, 'Ada', 'Lovelace');

    click(form.field('authors')!.element.querySelector('.edit-array-of-btn'));
    await flush();

    const dialog = entryDialog();
    expect((dialog.querySelector('[name=preName]') as HTMLInputElement).value).toBe('Ada');

    type(dialog.querySelector('[name=preName]') as HTMLElement, 'Augusta');
    click(dialog.querySelector('.low-bar .btn'));
    await flush();

    expect(form.getValues()['authors']).toEqual([
      expect.objectContaining({ preName: 'Augusta', lastName: 'Lovelace' }),
    ]);
  });

  it('applies mapFieldsOnEdit when editing', async () => {
    const mapFieldsOnEdit = vi.fn((fields: readonly { name: string }[]) =>
      fields.filter((f) => f.name === 'preName'),
    );

    const form = await makeAuthorsForm({}, { mapFieldsOnEdit });
    await addAuthor(form, 'Ada', 'Lovelace');

    click(form.field('authors')!.element.querySelector('.edit-array-of-btn'));
    await flush();

    expect(mapFieldsOnEdit).toHaveBeenCalled();
    expect(entryDialog().querySelector('[name=lastName]')).toBeNull();
  });

  it('tells the entry dialog it is editing rather than adding', async () => {
    const modes: boolean[] = [];
    const form = await makeAuthorsForm(
      {},
      {
        of: [
          {
            name: 'preName',
            tab: (ctx: { isEditingArrayEntry: boolean }) => {
              modes.push(ctx.isEditingArrayEntry);
              return 'Author';
            },
          },
        ],
      },
    );

    const el = form.field('authors')!.element;

    click(el.querySelector('.dl-form-array-of-add-entry'));
    await flush();
    expect(modes).toContain(false);
    expect(modes).not.toContain(true);

    type(entryDialog().querySelector('[name=preName]') as HTMLElement, 'Ada');
    click(entryDialog().querySelector('.low-bar .btn'));
    await flush();

    click(el.querySelector('.edit-array-of-btn'));
    await flush();
    expect(modes).toContain(true);
  });

  it('gates the entry dialog confirm button with isValidRecord', async () => {
    const form = await makeAuthorsForm(
      {},
      { isValidRecord: (entry: FormValues) => String(entry['preName']).length > 0 },
    );

    click(form.field('authors')!.element.querySelector('.dl-form-array-of-add-entry'));
    await flush();

    const dialog = entryDialog();
    const confirm = dialog.querySelector('.low-bar .btn') as HTMLElement;
    expect(confirm.className).toContain('disabled');

    type(dialog.querySelector('[name=preName]') as HTMLElement, 'Ada');
    await flush();
    expect(confirm.className).not.toContain('disabled');
  });

  it('notifies onChange after an entry is added', async () => {
    const onChange = vi.fn();
    const form = await makeAuthorsForm({}, { onChange });

    await addAuthor(form, 'Ada', 'Lovelace');
    await flush();

    expect(onChange).toHaveBeenCalled();
  });

  it('gives the entry dialog access to the parent form data', async () => {
    const seen: unknown[] = [];
    const form = await makeForm({
      fields: [
        { name: 'docTitle', defaultValue: 'Notes' },
        {
          name: 'authors',
          kind: 'array',
          of: [
            {
              name: 'preName',
              isActive: (ctx) => {
                seen.push(ctx.parentData?.['docTitle']);
                return true;
              },
            },
          ],
        },
      ],
    });

    click(form.field('authors')!.element.querySelector('.dl-form-array-of-add-entry'));
    await flush();

    expect(seen).toContain('Notes');
  });

  describe('suggestions', () => {
    it('renders a checkbox per suggestion', async () => {
      const form = await makeAuthorsForm(
        {},
        { suggested: [{ preName: 'Ada', lastName: 'Lovelace' }] },
      );

      const container = form.field('authors')!.element.querySelector(
        '.dl-form-array-suggested-container',
      )!;
      const item = container.querySelector('.dl-form-array-of-suggestion')!;

      expect(item.className).toContain('check');
      expect(item.querySelector('label')?.textContent).toBe('Ada, Lovelace');
    });

    it('adds an accepted suggestion to the value', async () => {
      const form = await makeAuthorsForm(
        {},
        { suggested: [{ preName: 'Ada', lastName: 'Lovelace' }] },
      );

      const checkbox = form.field('authors')!.element.querySelector(
        '.dl-form-array-of-suggestion input',
      ) as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await flush();

      expect(form.getValues()['authors']).toEqual([
        { preName: 'Ada', lastName: 'Lovelace' },
      ]);
    });

    it('drops it again when un-ticked', async () => {
      const form = await makeAuthorsForm(
        {},
        { suggested: [{ preName: 'Ada', lastName: 'Lovelace' }] },
      );

      const el = form.field('authors')!.element;
      let checkbox = el.querySelector('.dl-form-array-of-suggestion input') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await flush();

      checkbox = el.querySelector('.dl-form-array-of-suggestion input') as HTMLInputElement;
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      await flush();

      expect(form.getValues()['authors']).toEqual([]);
    });

    it('accepts a function of the form context', async () => {
      const form = await makeForm({
        fields: [
          { name: 'seed', defaultValue: 'Ada' },
          {
            name: 'authors',
            kind: 'array',
            of: authorFields,
            suggested: ({ data }) => [{ preName: String(data['seed']) }],
          },
        ],
      });

      expect(
        form.field('authors')!.element.querySelector(
          '.dl-form-array-of-suggestion label',
        )?.textContent,
      ).toBe('Ada');
    });

    it('does not duplicate a suggestion that was also added by hand', async () => {
      const form = await makeAuthorsForm({}, { suggested: [{ preName: 'Ada', lastName: 'Lovelace' }] });
      await addAuthor(form, 'Ada', 'Lovelace');

      const checkbox = form.field('authors')!.element.querySelector(
        '.dl-form-array-of-suggestion input',
      ) as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await flush();

      expect(form.getValues()['authors']).toHaveLength(1);
    });
  });
});
