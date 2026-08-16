# Field kinds

A field is a **plain object**. The `kind` property selects the behaviour;
everything else configures it. Descriptors are never mutated by the library, so
you can freeze them, share them between forms, or generate them from data.

```ts
{ name: 'title', displayName: 'Title' }                        // text (default)
{ name: 'note', kind: 'textarea', allowNewlines: true }
{ name: 'lang', kind: 'select', options: ['en', 'de'] }
```

## The ten built-in kinds

| `kind`                                   | Renders                | Key options                                            |
| ---------------------------------------- | ---------------------- | ------------------------------------------------------ |
| [`text`](/guide/fields/text) _(default)_ | `<input>`              | `type`, `placeholder`, `autocomplete`                  |
| [`textarea`](/guide/fields/textarea)     | `<textarea>`           | `placeholder`, `allowNewlines`                         |
| [`select`](/guide/fields/select)         | `<dl-select>` combobox | `options`, `multiple`, `placeholder`, `onOptionsError` |
| [`checkbox`](/guide/fields/checkbox)     | checkbox + caption     | `label`                                                |
| [`message`](/guide/fields/message)       | `<p>` — holds no value | `message`                                              |
| [`file`](/guide/fields/file)             | file picker + preview  | `accept`                                               |
| [`computed`](/guide/fields/computed)     | nothing visible        | `compute`                                              |
| [`cards`](/guide/fields/cards)           | clickable option cards | `cards`                                                |
| [`custom`](/guide/fields/custom)         | whatever you render    | `render`                                               |
| [`array`](/guide/fields/array)           | repeating sub-records  | `of`, `renderEntry`, `suggested`, …                    |

You can also [register your own kinds](/guide/custom-fields).

## Options every kind accepts

```ts
interface BaseFieldDescriptor {
  name: string; // required, unique within the form
  displayName?: TextOrHtml; // label; omit for no label
  className?: string; // extra classes on the field wrapper
  tab?: Reactive<TabSpec>; // which tab(s) this field belongs to
  tooltip?: TextOrHtml | TooltipDescriptor;
  isActive?: (ctx) => boolean; // false hides it and drops it from getValues()
  onFormChange?: (ctx) => void; // called on every form update
  reloadOnChangeOf?: string[]; // dependencies that re-run async work
  defaultValue?: Reactive<unknown>;
}
```

### `name`

The key the value appears under in `getValues()`. Duplicate names throw at
construction time rather than silently overwriting each other.

### `displayName`

The label. Omitting it adds a `withoutLabel` class to the wrapper instead of
rendering an empty `<label>`. The label is properly associated with its control
via `for`/`id`.

### `tooltip`

Either a string, or `{ text, inInput }`. With `inInput: true` the `?` marker is
positioned inside the input rather than beside the label.

```ts
{ name: 'url', displayName: 'URL', tooltip: 'Where the data comes from.' }
{ name: 'key', displayName: 'Key', tooltip: { text: 'Secret.', inInput: true } }
```

Tooltip state can be driven at runtime — see
[`setTooltipError` and friends](/reference/api#tooltips).

## `Reactive<T>`: literal or function

Most options accept **either a value or a function of the form context**. This
is what makes the descriptor live rather than static:

```ts
type Reactive<T> = T | ((ctx: FieldContext) => T);
```

```ts
// literal
{ name: 'year', defaultValue: '2026' }

// function of current form data
{ name: 'year', defaultValue: () => String(new Date().getFullYear()) }

// placeholder that follows another field
{
  name: 'locator',
  placeholder: ({ data }) => `enter a ${String(data['kind'] ?? 'page')}`,
}
```

## The context object

Every callback receives **one context object** — never a positional argument
list:

```ts
interface FieldContext {
  data: FormValues; // this form's current values
  form: DeclarativeForm; // the owning form
  field: FieldDescriptor; // the descriptor being evaluated
  parentData: FormValues | undefined; // enclosing form, when nested
  stackData: readonly FormValues[]; // every open dialog, outermost first
  isEditingArrayEntry: boolean; // true in an "edit entry" dialog
}
```

Two callbacks extend it:

- `onFormChange` also gets **`trigger`** — the field whose input started the
  update, or `undefined`.
- A `custom` field's `render` also gets **`element`**, **`requestUpdate()`**
  and **`setValue()`**.

Destructure what you need:

```ts
{
  name: 'token',
  isActive: ({ data }) => data['source'] === 'GitLab',
}
```

## Values and types

`getValues()` returns `Record<string, unknown>`. What each kind contributes:

| Kind                     | Value type                    | Empty value           |
| ------------------------ | ----------------------------- | --------------------- |
| `text`, `textarea`       | `string`                      | `''`                  |
| `select`                 | `string`                      | `''`                  |
| `select` with `multiple` | `string[]`                    | `[]`                  |
| `checkbox`               | `boolean`                     | `false`               |
| `file`                   | `string` (a URL)              | `''`                  |
| `cards`                  | `string`                      | `''`                  |
| `computed`               | whatever `compute` returns    | `''` before first run |
| `custom`                 | whatever you `setValue()`     | `''`                  |
| `array`                  | `FormValues[]`                | `[]`                  |
| `message`                | _(absent from `getValues()`)_ | —                     |

::: warning `message` fields hold no value
A `message` field is presentational. It does not appear in `getValues()` at
all — not even as an empty string. This differs from v1, which emitted `''`.
:::
