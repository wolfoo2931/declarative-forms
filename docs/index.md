# declarative-forms

A **declarative form runtime** for the web. You describe the data you need and
the rules around it; the library renders the dialog, wires the updates, loads
async option sets, manages nested records, tabs and modal stacks, and keeps
everything in sync as values change.

```ts
import 'declarative-forms/styles.css';
import { DeclarativeForm } from 'declarative-forms';

new DeclarativeForm({
  fields: [
    { name: 'title', displayName: 'Title' },
    {
      name: 'language',
      kind: 'select',
      displayName: 'Language',
      options: [
        { value: 'en', label: 'English' },
        { value: 'de', label: 'German' },
      ],
      defaultValue: 'en',
    },
  ],
  onConfirm: (values) => console.log(values),
  onCancel: () => {},
}).openInModal();
```

That is the whole program. There is no markup to write, no state to hold, and
no framework to adopt.

## How it differs from other form libraries

**vs. React Hook Form, Formik, VeeValidate.** Those are _state_ libraries bound
to one framework — you still write every input, label and layout yourself.
`declarative-forms` renders the whole dialog and is framework-agnostic: it is
plain DOM plus one web component, usable from React, Vue, Svelte, or a
`<script>` tag.

**vs. JSON-Schema renderers (react-jsonschema-form, JSONForms, formily).**
Those derive a form from a _static_ data schema. Here the descriptor is **live**:
`options`, `isActive`, `defaultValue`, `placeholder`, `message`, `tab` and
`compute` may each be a function of the current form data, and
[`reloadOnChangeOf`](/guide/reactivity) declares the dependency edges between
fields. Cross-field reactivity and async option loading are the core feature,
not an escape hatch.

**vs. `<dialog>` plus a UI kit.** Modal stacking with parent data visible to
child dialogs, tabs that hide themselves when empty, buttons whose
enabled/visible state is an async predicate of form data, and repeating
sub-forms with accept/reject suggestions are all built in.

**Zero runtime dependencies.** No build step required.

## Where it fits best

Its real specialisation is **settings and metadata dialogs for document-centric
apps**: many optional fields, grouped into tabs, where the available choices
depend on what else is selected. Concretely:

- admin panels and settings dialogs
- configuration flows with conditions and dependencies
- modal wizards with step logic
- forms whose options are fetched and depend on other fields
- list editing with nested record forms
- internal tools that need data-driven UI without a framework dependency

## Where it does not fit

Worth saying plainly, so you can rule it out quickly:

- It is **not a general-purpose form library**. It renders one opinionated
  layout. If you need full control of markup, use a state library instead.
- It has **no validation framework**. There is `isActive` for conditional
  fields and `isValidRecord`/button `isActive` for gating submission, but no
  rule engine, no error-message system, no schema validation.
- **Accessibility is a work in progress.** Labels, ids and focusable buttons
  are correct; dialog semantics, combobox ARIA and keyboard-reachable
  checkboxes are not there yet. See [Accessibility](/accessibility) for the
  full, honest list before adopting it somewhere that requires conformance.

## Next

- [Getting started](/guide/getting-started) — install and build your first form
- [Field kinds](/guide/fields/) — the ten built-in kinds
- [Reactivity](/guide/reactivity) — the part that makes this library worth using
- [Migrating from v1](/migration-v1) — if you are on the pre-TypeScript version
