# `select`

A filterable combobox, rendered as the [`<dl-select>`](/reference/dl-select)
web component. It exists because a native `<select>` cannot do async-loaded,
type-to-filter, multi-select options.

Click the field and type to filter. The value stored is the option's `value`,
not its label.

<LiveForm>

```ts
{
  fields: [
    {
      name: 'language',
      kind: 'select',
      displayName: 'Language',
      options: [
        { value: 'en', label: 'English' },
        { value: 'de', label: 'German' },
        { value: 'fr', label: 'French' },
      ],
      defaultValue: 'en',
    },
    {
      name: 'tags',
      kind: 'select',
      displayName: 'Tags (multiple)',
      multiple: true,
      options: ['docs', 'draft', 'internal'],
    },
  ],
}
```

</LiveForm>

## Options

| Option           | Type                                                  | Notes                                        |
| ---------------- | ----------------------------------------------------- | -------------------------------------------- |
| `options`        | `Reactive<SelectOption[] \| Promise<SelectOption[]>>` | Required. Four shapes, below                 |
| `multiple`       | `boolean`                                             | Value becomes a `string[]`                   |
| `placeholder`    | `Reactive<string>`                                    | Shown when nothing is selected               |
| `onOptionsError` | `(ctx) => FieldMessage \| undefined`                  | Turns a rejected load into a tooltip message |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## The four option shapes

**Plain strings** — value and label are the same:

```ts
options: ['Admin', 'Editor', 'Viewer'];
```

**Value and label** — when the stored value differs from what is shown:

```ts
options: [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
];
```

**With `displayWhenSelected`** — a third, shorter form shown once chosen, while
the dropdown keeps the descriptive label:

```ts
options: [
  { value: 'bk', label: 'Book', displayWhenSelected: 'Type: Book' },
  { value: 'art', label: 'Journal Article', displayWhenSelected: 'Type: Article' },
];
```

**A function** — sync or async, of the form context:

```ts
options: async ({ data }) => {
  const res = await fetch(`/api/repos?owner=${String(data['owner'])}`);
  return (await res.json()).map((r) => ({ value: r.id, label: r.name }));
};
```

## Async loading

When `options` returns a promise the field shows a loading skeleton. Two details
make it feel deliberate rather than flickery:

- The skeleton only appears after ~100 ms, so fast loads never flash one.
- Once shown it stays for a minimum time rather than blinking out.

A value set while options are still loading is **replayed** once they arrive, so
a `defaultValue` never races the fetch. The demo below delays for a second, and
still ends up on French:

<LiveForm>

```ts
{
  fields: [
    {
      name: 'lang',
      kind: 'select',
      displayName: 'Language (loads slowly)',
      options: async () => {
        await new Promise((r) => setTimeout(r, 1000));
        return [
          { value: 'en', label: 'English' },
          { value: 'fr', label: 'French' },
        ];
      },
      defaultValue: 'fr',
    },
  ],
}
```

</LiveForm>

## Reloading when another field changes

List `reloadOnChangeOf` to re-run an options function when a dependency changes:

```ts
{
  name: 'owner',
  displayName: 'Owner',
},
{
  name: 'repo',
  kind: 'select',
  displayName: 'Repository',
  reloadOnChangeOf: ['owner'],
  options: async ({ data }) => fetchRepos(String(data['owner'])),
}
```

::: tip Stale responses are discarded
Each load claims a generation token. If the user keeps typing and a newer load
starts, an older in-flight response is **dropped** rather than overwriting the
fresher options. You do not need to debounce for correctness.
:::

See [Reactivity](/guide/reactivity) for the full picture.

## Handling load failures

An options function that rejects leaves the field empty and silent unless you
say what should happen. `onOptionsError` turns the error into a tooltip:

```ts
{
  name: 'repo',
  displayName: 'Repository',
  tooltip: 'Pick a repository.',
  kind: 'select',
  options: async () => fetchRepos(),
  onOptionsError: ({ error }) => ({
    level: 'error',
    text: `Could not load repositories: ${(error as Error).message}`,
  }),
}
```

`level` is `'info'`, `'warning'` or `'error'`; the first two render as a warning
marker, the third as an error marker. The tooltip resets automatically on the
next successful reload.

::: warning Needs a tooltip to show in
The message is displayed on the field's `?` marker, so the field must declare a
`tooltip` for there to be somewhere to put it. Without one, the handler runs but
nothing is visible.
:::

## Multi-select

```ts
{
  name: 'tags',
  kind: 'select',
  displayName: 'Tags',
  multiple: true,
  options: ['docs', 'draft', 'internal'],
  defaultValue: ['docs'],
}
```

The value is a `string[]`. Each selection renders a removable tag; already
selected options are marked and cannot be picked twice.

## Rich option labels

Option labels are rendered as **text** by default. To include markup — a badge,
say — mark it explicitly with `html()`:

```ts
import { html } from 'declarative-forms';

options: [
  {
    value: 'offline',
    label: html('Formless Writing <span class="dl-option-tag">Offline</span>'),
  },
];
```

See [Text & HTML safety](/guide/security).

## Values

`getValue()` returns the selected option's **value**, not its label — `''` when
nothing is selected, or `[]` for a `multiple` field.

```ts
form.field('language')?.setValue('de');
form.getValues()['language']; // 'de'
```

Setting a value that matches no option is ignored rather than throwing.
