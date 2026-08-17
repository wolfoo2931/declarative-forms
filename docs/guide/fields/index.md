# Field kinds

A field is a **plain object**. The `kind` property chooses the behaviour, and
everything else configures it. The library never changes a descriptor, so you
can freeze one, share it between forms, or generate it from data.

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

You can also [add kinds of your own](/guide/custom-fields).

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

The key that the value appears under in `getValues()`. Two fields with the same
name raise an error while the form is being built, instead of quietly
overwriting each other.

### `displayName`

The label. If you leave it out, the wrapper gets a `withoutLabel` class instead
of an empty `<label>`. The label is correctly connected to its control through
`for` and `id`.

### `tooltip`

Either a string, or an object `{ text, inInput }`. With `inInput: true`, the `?`
marker sits inside the input instead of next to the label.

```ts
{ name: 'url', displayName: 'URL', tooltip: 'Where the data comes from.' }
{ name: 'key', displayName: 'Key', tooltip: { text: 'Secret.', inInput: true } }
```

You can also change a tooltip while the form is open — this is how a field
reports an error, a warning or a pending check. See
[Validation](/guide/validation) for the pattern, and
[`setTooltipError` and the related methods](/reference/api#tooltips) for the
signatures.

::: tip A field with no `tooltip` cannot show a message
`setTooltipError` and friends are silent no-ops when the descriptor declares no
`tooltip`, because there is no marker to write on. Declare one for any field you
intend to validate.
:::

## `Reactive<T>`: literal or function

Most options accept **either a fixed value or a function of the form context**.
This is what makes a descriptor live instead of static:

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

Every callback receives **a single context object**. There are never several
positional arguments:

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

Two callbacks get more than that:

- `onFormChange` also gets **`trigger`**: the field whose input started the
  update, or `undefined`.
- The `render` function of a `custom` field also gets **`element`**,
  **`requestUpdate()`** and **`setValue()`**.

Take only the properties you need:

```ts
{
  name: 'token',
  isActive: ({ data }) => data['source'] === 'GitLab',
}
```

## Values and types

`getValues()` returns a `Record<string, unknown>`. This is what each kind puts
into it:

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

::: warning A `message` field has no value
A `message` field only displays text. It does not appear in `getValues()` at
all — not even as an empty string. This is different from v1, which returned
`''` for it.
:::
