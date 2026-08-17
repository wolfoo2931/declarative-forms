# declarative-forms

**Ask the user for an object, the way `prompt()` asks for a string.**

Every other form library gives you a _component to mount_. This one gives you a
_function to call_. There is no component, no form state, no mount point, and no
place in your tree where the form has to live. You ask a question from wherever
you happen to be standing in your code, and you get the answer back.

```ts
const release = await ask([
  { name: 'title', displayName: 'Release title' },
  { name: 'notes', kind: 'textarea', displayName: 'What changed' },
  {
    name: 'reviewers',
    kind: 'select',
    multiple: true,
    displayName: 'Sign-off from',
    options: () => fetchReviewers(),
  },
]);

// { title: 'Sunrise 2.0', notes: '…', reviewers: ['Ada', 'Grace'] }
```

That is the whole integration. No `<Form>`, no `useForm`, no `onChange`, no
`useState`, no layout, no `<div>`. The dialog draws itself, loads its own
options, keeps every field in sync, and resolves.

`ask` is nine lines you write once on top of the public API —
[here it is](https://wolfoo2931.github.io/declarative-forms/guide/asking-for-data#the-ask-helper).

📖 **[Read the documentation](https://wolfoo2931.github.io/declarative-forms/)** ·
🎛 **[Try the live demo](https://wolfoo2931.github.io/declarative-forms/#demo)**

## Why a call and not a component

`window.prompt()` is the one form API the browser gives you for free. You ask,
the browser draws the dialog, you get the answer. No markup, no state, no
layout, no lifecycle. Its only flaw is that it can ask for exactly one string.

Everything the industry built to replace it went the other way — into the
component tree:

```jsx
// The component model: the form is a thing that lives somewhere.
const { register, handleSubmit } = useForm();
return (
  <Modal open={open} onClose={() => setOpen(false)}>
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />…
    </form>
  </Modal>
);
```

Now the form has a _location_. It needs a parent, a piece of `open` state, a
close handler, a submit handler, and a route from the answer back to the code
that wanted it. For a product's signup page, that is fine — you were going to
lay that page out anyway. For the two hundredth settings dialog in an internal
tool, it is all overhead: you did not want a form, you wanted an answer.

`declarative-forms` keeps `prompt()`'s shape and removes its one-string limit.
The form is not a thing that lives somewhere. It is a question, asked and
answered:

```ts
if (await confirmDetails()) { … }

const filters = await ask(filterFields);
const entry   = await ask(entryFields, { confirmLabel: 'Add' });
```

## What that model gives you that a component cannot

**Dialogs stack, and the inner one can read the outer ones.** Because a form is
a call and not a node, opening one from inside another is just... calling it.
The library keeps the stack, and any field in any dialog can read the values of
every dialog beneath it through `stackData` — with no lifted state, no context
provider, and no prop drilling, because there is no tree to lift through.

```ts
{
  name: 'recap',
  kind: 'message',
  // stackData[0] is the outermost dialog, still open behind this one.
  message: ({ data, stackData }) =>
    `Publishing ${stackData[0]['title']} ${data['when'] === 'now' ? 'now' : 'later'}.`,
}
```

**Lists of records are just the same call again.** An `array` field opens one
dialog per entry, which is the natural shape for a record, and awkward to do
inline.

**Works anywhere, because it needs nothing.** Plain DOM plus one web component,
no runtime dependencies. Call it from React, Vue, Svelte, Angular, an Electron
main-window script, or a `<script type="module">` tag in a static page. It never
touches your render tree, so there is nothing to integrate.

**The descriptor is live, not static.** `options`, `isActive`, `defaultValue`,
`placeholder`, `message`, `tab` and `compute` may each be a _function of the
current values_, and `reloadOnChangeOf` declares which field depends on which.
Options loaded from your API that change when another field changes are the
core feature, not an extension point.

## Install

```bash
npm install declarative-forms
```

```ts
import 'declarative-forms/styles.css';
```

That is the default look, and it follows the operating system's light/dark
setting on its own. The v1 look ships as `declarative-forms/classic.css`.

No build step is required — the ESM build loads directly in a `<script type="module">`.

## The full API, if you want the object instead of the promise

`ask` is a convenience you own. Underneath, a form is a normal object you can
hold on to, embed in a page instead of a dialog, subscribe to, and drive from
code:

```ts
import { DeclarativeForm } from 'declarative-forms';

const form = new DeclarativeForm({
  fields: [...],
  onConfirm: (values) => save(values),
  onCancel: () => {},
});

form.openInModal();                       // …or:
form.appendInElement(document.querySelector('#panel'));

form.subscribeOnInput((values) => renderPreview(values));
form.field('role')?.setValue('Admin');
```

See [the API reference](https://wolfoo2931.github.io/declarative-forms/reference/api).

## The ten field kinds

`text` · `textarea` · `select` (single, multiple, async, searchable) ·
`checkbox` · `message` · `file` · `computed` · `cards` · `custom` · `array`

Full descriptions in **[Field kinds](https://wolfoo2931.github.io/declarative-forms/guide/fields/)**.

## Where it fits

Best in **settings and metadata dialogs for tool-like apps**: many optional
fields, grouped into tabs, where the available choices depend on what the user
already picked.

- admin panels and settings dialogs
- configuration flows with conditions and dependencies
- modal wizards with several steps
- forms whose options come from a server and depend on other fields
- editing lists whose entries are records of their own
- internal tools that need a data-driven UI without a framework dependency

## Where it does not fit

Plainly, so you can rule it out fast:

- **It is not a general-purpose form library.** It renders one fixed layout. If
  you need control over the markup — a product signup page, a marketing form —
  use a state library and write the markup yourself.
- **There is no validation framework.** No `required`, no rule objects, no
  schema. There _are_ per-field error, warning and loading messages
  (`setTooltipError` and friends), and `isValidRecord` and a button's `isActive`
  gate submission — but you write each check yourself, and the message and the
  gate are separate things you wire up separately. See
  [Validation](https://wolfoo2931.github.io/declarative-forms/guide/validation).
- **Accessibility is unfinished.** Labels, ids, focusable buttons and
  keyboard-reachable checkboxes are correct. Dialog semantics, a focus trap, and
  combobox ARIA are not. Read
  [Accessibility](https://wolfoo2931.github.io/declarative-forms/accessibility)
  in full before using it where conformance is required.
- **The rendered DOM is a frozen contract.** Class names, ids and structure are
  stable across the v1 → v2 rewrite, so existing stylesheets keep working. See
  the [DOM contract](https://wolfoo2931.github.io/declarative-forms/dom-contract).

## Documentation

- [Asking for data](https://wolfoo2931.github.io/declarative-forms/guide/asking-for-data) — the model, and the `ask` helper
- [Getting started](https://wolfoo2931.github.io/declarative-forms/guide/getting-started)
- [Field kinds](https://wolfoo2931.github.io/declarative-forms/guide/fields/)
- [Reactivity](https://wolfoo2931.github.io/declarative-forms/guide/reactivity) — `isActive`, `reloadOnChangeOf`, computed fields
- [Validation](https://wolfoo2931.github.io/declarative-forms/guide/validation) — checks, tooltip messages, gating submit
- [Modals & stacking](https://wolfoo2931.github.io/declarative-forms/guide/modals)
- [API reference](https://wolfoo2931.github.io/declarative-forms/reference/api)
- [Migrating from v1](https://wolfoo2931.github.io/declarative-forms/migration-v1)

## License

MIT © Oliver Wolf
