# Getting started

## Install

```bash
npm install declarative-forms
```

Import the stylesheet once, anywhere in your app:

```ts
import 'declarative-forms/styles.css';
```

The package contains an ESM build and a CJS build, both with TypeScript
declarations, and it has **no runtime dependencies**.

::: tip No build step needed
You can also load the ESM build directly in a page with
`<script type="module">`. The `<dl-select>` component adds its own structural
CSS the first time it is used, so the stylesheet above is the only one you have
to load.
:::

## Your first form

A form is an array of **field descriptors**, plus what should happen when the
form closes.

<LiveForm>

```ts
{
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
}
```

</LiveForm>

In your own code, you pass that object to the constructor:

```ts
import { DeclarativeForm } from 'declarative-forms';

const form = new DeclarativeForm({/* … */});
form.openInModal();
```

Three things are worth noticing:

- **`name` is the key.** The value appears under this name in `getValues()`, so
  it must be unique within one form.
- **`kind` chooses the field type.** Leave it out and you get a single-line text
  input. See [Field kinds](/guide/fields/).
- **`onCancel` decides whether the dialog can be closed without finishing it.**
  If you pass it, the dialog gets a close button and reacts to
  <kbd>Escape</kbd>. If you leave it out, the user can only complete the dialog,
  not abandon it.

## Reading values

```ts
form.getValues();
// { name: 'Ada', role: 'Editor', activeTab: undefined }
```

`getValues()` returns a plain object whose keys are the field names. Two rules
to remember:

- A field hidden by [`isActive`](/guide/reactivity) is **left out completely**.
  It is not set to an empty value.
- The key `activeTab` is always there. It holds the currently selected
  [tab](/guide/tabs), or `undefined` if the form has no tabs.

To follow the values as the user types, subscribe to them:

```ts
const unsubscribe = form.subscribeOnInput((values) => {
  console.log(values);
});
```

## Waiting for setup

Options and default values may be loaded asynchronously, so the form is not
completely filled in at the moment the constructor returns. `whenReady()`
resolves once the first options have loaded and the default values have been
applied:

```ts
const form = new DeclarativeForm({/* … */});
await form.whenReady();

form.getValues(); // defaults are in place
```

You do not need this in order to _show_ a form. You can call `openInModal()`
straight away, and each field fills itself in as its data arrives. You need
`whenReady()` when you want to read the values in code right after construction,
or in a test.

## Embedding instead of a modal

Not every form has to be a dialog. `appendInElement` renders the same form
inside an element of your page:

```ts
form.appendInElement(document.querySelector('#panel'));
```

The outer wrapper gets a `noModalDialog` class and there is no backdrop.
Confirming the form runs your callback but **does not** remove the form from the
page. See [Modals & stacking](/guide/modals).

## Controlling a single field from code

Sometimes you need to control one field from outside the form: to set a value
after a lookup, or to show a loading state while you fetch something.

```ts
const field = form.field('role');

field?.setValue('Admin');
field?.getValue();
field?.focus();
field?.setLoading(true);
field?.element; // the underlying <input> / <dl-select> / …
```

`form.field(name)` returns `undefined` if no field has that name, so use
optional chaining (`?.`) or check the result first.

## TypeScript

The descriptor types form a discriminated union on `kind`. The compiler
therefore knows which options each kind accepts, and rejects the others:

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
