# `array`

A repeating list of sub-records. Each entry is edited in its own nested dialog,
built from the field descriptors you supply.

Press **Add Author** to open the nested entry dialog. The parent form stays
open underneath, hidden until the entry dialog closes.

<LiveForm>

```ts
{
  fields: [
    {
      name: 'authors',
      kind: 'array',
      displayName: 'Authors',
      newButtonLabel: 'Add Author',
      of: [
        { name: 'preName', displayName: 'First name' },
        { name: 'lastName', displayName: 'Last name' },
      ],
      isValidRecord: (entry) => String(entry['lastName'] ?? '').trim() !== '',
      suggested: [{ preName: 'Ada', lastName: 'Lovelace' }],
    },
  ],
}
```

</LiveForm>

## Options

| Option            | Type                                          | Notes                                             |
| ----------------- | --------------------------------------------- | ------------------------------------------------- |
| `of`              | `FieldDescriptor[]`                           | Required. The fields of one entry                 |
| `newButtonLabel`  | `string`                                      | Add-button caption. Default `'Add'`               |
| `renderEntry`     | `(entry) => TextOrHtml`                       | One-line summary of an entry                      |
| `isValidRecord`   | `(entry, ctx) => boolean \| Promise<boolean>` | Gates the entry dialog's confirm button           |
| `mapFieldsOnEdit` | `(fields, entry) => FieldDescriptor[]`        | Adjust fields when editing rather than adding     |
| `suggested`       | `Reactive<FormValues[]>`                      | Opt-in entries offered as checkboxes              |
| `onChange`        | `(values) => void`                            | Called after an entry is added, edited or removed |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## Values

The value is an array of objects, each keyed by the names in `of`:

```ts
form.getValues()['authors'];
// [ { preName: 'Ada', lastName: 'Lovelace', activeTab: undefined } ]
```

The empty value is `[]`. A `defaultValue` seeds the list.

## Entry summaries

By default an entry is summarised by joining its non-empty string values with
commas. Supply `renderEntry` for something better:

```ts
{
  name: 'authors',
  kind: 'array',
  of: [
    { name: 'preName', displayName: 'First name' },
    { name: 'lastName', displayName: 'Last name' },
    { name: 'role', kind: 'select', options: ['Author', 'Editor'], defaultValue: 'Author' },
  ],
  renderEntry: (entry) =>
    `${String(entry['preName'])} ${String(entry['lastName'])} (${String(entry['role'])})`,
}
```

## Validating an entry

`isValidRecord` gates the **entry dialog's** confirm button, so a half-filled
record cannot be added. It may be async.

```ts
isValidRecord: (entry) => String(entry['lastName'] ?? '').trim().length > 0,
```

## Editing vs. adding

When the user edits an existing entry, the dialog's fields are seeded with that
entry's current values. `mapFieldsOnEdit` lets you change the field set for the
edit case — hiding an immutable key, say:

```ts
mapFieldsOnEdit: (fields, entry) =>
  fields.filter((field) => field.name !== 'id'),
```

Inside any descriptor callback, `ctx.isEditingArrayEntry` tells you which mode
the dialog is in:

```ts
of: [
  {
    name: 'preName',
    tab: ({ isEditingArrayEntry }) => (isEditingArrayEntry ? 'Edit' : 'New'),
  },
];
```

## Reaching the parent form

An entry dialog is a nested form, so its callbacks can see the enclosing form's
values through `ctx.parentData`:

```ts
of: [
  {
    name: 'affiliation',
    isActive: ({ parentData }) => parentData?.['kind'] === 'academic',
  },
];
```

`ctx.stackData` gives every open dialog's values, outermost first. See
[Modals & stacking](/guide/modals).

## Suggestions

`suggested` offers pre-filled entries as checkboxes above the list. Ticking one
adds it to the value; unticking removes it again.

```ts
{
  name: 'authors',
  kind: 'array',
  of: authorFields,
  suggested: [
    { preName: 'Ada', lastName: 'Lovelace' },
    { preName: 'Grace', lastName: 'Hopper' },
  ],
}
```

Suggestions may also be a function of the form context — useful when they come
from the document being edited:

```ts
suggested: ({ data, parentData }) => collaboratorsOf(parentData?.['docId']),
```

A suggestion that duplicates an entry the user already added by hand is **not**
added twice.

See [Arrays & suggestions](/guide/arrays) for the fuller treatment.

## Reacting to changes

`onChange` fires after an entry is added, edited or removed, once pending work
has settled:

```ts
onChange: (values) => saveDraft(values),
```
