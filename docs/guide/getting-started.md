# Getting started

## Install

```bash
npm install declarative-forms
```

Import the stylesheet once, anywhere in your app:

```ts
import 'declarative-forms/styles.css';
```

The package ships ESM and CJS builds with TypeScript declarations, and has
**zero runtime dependencies**.

::: tip No build step
You can also drop the ESM build straight into a page with
`<script type="module">`. The `<dl-select>` component injects its own
structural CSS on first use, so the only stylesheet you need to load is the one
above.
:::

## Your first form

A form is an array of **field descriptors** plus what to do when it closes.

```ts
import { DeclarativeForm } from 'declarative-forms';

const form = new DeclarativeForm({
  fields: [
    { name: 'name', displayName: 'Name' },
    {
      name: 'role',
      kind: 'select',
      displayName: 'Role',
      options: ['Admin', 'Editor', 'Viewer'],
      defaultValue: 'Editor',
    },
  ],
  onConfirm: (values) => console.log('submitted', values),
  onCancel: () => console.log('cancelled'),
});

form.openInModal();
```

Three things are worth noticing:

- **`name` is the key.** It is how the value appears in `getValues()`, and it
  must be unique within a form.
- **`kind` selects the field type.** Omit it and you get a single-line text
  input. See [Field kinds](/guide/fields/).
- **`onCancel` decides whether the dialog can be dismissed.** Provide it and
  you get a close button and Escape handling; omit it and the dialog can only
  be completed, not abandoned.

## Reading values

```ts
form.getValues();
// { name: 'Ada', role: 'Editor', activeTab: undefined }
```

`getValues()` returns a plain object keyed by field name. Two rules to know:

- Fields hidden by [`isActive`](/guide/reactivity) are **omitted entirely**,
  not set to empty.
- The key `activeTab` is always present, holding the currently selected
  [tab](/guide/tabs) (or `undefined` when the form has no tabs).

To observe changes as the user types, subscribe:

```ts
const unsubscribe = form.subscribeOnInput((values) => {
  console.log(values);
});
```

## Waiting for setup

Options and default values may be asynchronous, so the form is not fully
populated the instant the constructor returns. `whenReady()` resolves once the
initial options have loaded and defaults have been applied:

```ts
const form = new DeclarativeForm({/* … */});
await form.whenReady();

form.getValues(); // defaults are in place
```

You do not need this to _display_ a form — `openInModal()` is safe to call
immediately, and fields fill in as they resolve. You need it when you want to
read values programmatically right after construction, or in tests.

## Embedding instead of a modal

Not every form should be a dialog. `appendInElement` renders the same form
inline:

```ts
form.appendInElement(document.querySelector('#panel'));
```

The outer wrapper gains a `noModalDialog` class, the backdrop is dropped, and
confirming the form runs your callback **without** removing it from the page.
See [Modals & stacking](/guide/modals).

## Reaching a field imperatively

Sometimes you need to drive a field from outside — set a value after a lookup,
or show a loading state while you fetch:

```ts
const field = form.field('role');

field?.setValue('Admin');
field?.getValue();
field?.focus();
field?.setLoading(true);
field?.element; // the underlying <input> / <dl-select> / …
```

`form.field(name)` returns `undefined` for a name that does not exist, so use
optional chaining or check first.

## TypeScript

Descriptors are a discriminated union on `kind`, so the compiler knows which
options each kind accepts and will reject the rest:

```ts
import type { FieldDescriptor } from 'declarative-forms';

const fields: FieldDescriptor[] = [
  { name: 'note', kind: 'textarea', allowNewlines: true },
  // Error: 'allowNewlines' does not exist on a select field.
  // { name: 'lang', kind: 'select', options: [], allowNewlines: true },
];
```

## Next

- [Field kinds](/guide/fields/) — what you can put in `fields`
- [Reactivity](/guide/reactivity) — fields that depend on other fields
- [Buttons](/guide/buttons) — replacing the default OK button
