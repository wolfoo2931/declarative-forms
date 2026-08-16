# declarative-forms

Declarative forms for the web that make front-end development less front-end development.

Whenever you need input from a user, you describe the data you need and the rules around it. `declarative-forms` takes care of the front-end work to ask for that information: rendering the fields, wiring updates, loading async option sets, managing nested structures, handling modal stacks, tabs, and keeping the UI in sync as values change.

📖 **[Read the documentation](https://wolfoo2931.github.io/declarative-forms/)**

You do not have to build the front-end plumbing by hand just to collect structured input. Instead, you provide a schema-like description of the form and the library handles the rest.

This is especially useful for complex forms, complex data structures, and workflows where the interface is mostly there to collect and validate user input rather than to render bespoke product UI.

## What it is

At its core, `declarative-forms` is a framework-agnostic form engine.

You define a form like this:

```ts
import 'declarative-forms/styles.css';
import { DeclarativeForm } from 'declarative-forms';

const form = new DeclarativeForm({
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
    {
      name: 'repo',
      kind: 'select',
      displayName: 'Repository',
      reloadOnChangeOf: ['language'],
      options: async ({ data }) => {
        const lang = String(data['language'] ?? 'en');
        return [{ value: `repo-${lang}`, label: `Repo (${lang})` }];
      },
    },
  ],
  onConfirm: (values) => console.log(values),
  onCancel: () => {},
});

form.openInModal();
```

This is not a generated UI package or a full application framework. It is a runtime for declarative form behavior: you describe the data model and form rules, and it turns that into a working user flow with the UI concerns handled for you.

## What makes it different

The library is built around a few real strengths that show up in the codebase:

- Data-first form definitions instead of manual DOM creation
- Cross-field reactivity via `reloadOnChangeOf`, `isActive`, `defaultValue`, and `onFormChange`
- Async option loading and async button predicates
- Built-in modal stack support for nested dialogs and wizards
- Tabbed forms and array-of-record editing
- Automatic handling of many front-end concerns: layout, state sync, stacking, dialog behavior, and reusable field logic
- Zero runtime dependencies
- Works in plain JavaScript or TypeScript, not just React/Vue/Svelte

The library also includes a few opinionated features that are especially useful for interactive tools:

- computed fields that recalculate before confirmation
- file fields that require a `persistFile` callback to convert a local file into a stored URL
- custom render fields for embedding arbitrary DOM or widget logic inside a form
- message, cards, and custom field types for dynamic UI without a separate component library

## When to use this library

Use `declarative-forms` when the form is more like an application workflow than a static input form.

It fits especially well for:

- admin panels and settings dialogs
- configuration flows with conditions and dependencies
- modal-based wizards with step logic
- forms whose options depend on other fields
- array/list editing with nested record forms
- internal tools that need compact, data-driven UI without a UI framework dependency

## Core ideas in the codebase

The library is centered on a few runtime concepts:

- `DeclarativeForm`: the main runtime that owns rendering, values, tabs, and modal behavior
- `FieldDescriptor`: a plain object describing each field (`name`, `kind`, `options`, `tab`, `isActive`, etc.)
- `FormValues`: the current data dictionary keyed by field name
- `subscribeOnInput`: a way to observe form updates without wiring lots of DOM listeners
- `ButtonDescriptor`: supports async enable/disable logic and “do not close” actions for wizards

This is why the project feels more like a small “form engine” than a typical form component library.

## Install

```bash
npm install declarative-forms
```

And include the default CSS:

```ts
import 'declarative-forms/styles.css';
```

## Example: modal form

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
  onConfirm: (values) => {
    console.log('submitted', values);
  },
  onCancel: () => {
    console.log('cancelled');
  },
});

form.openInModal();
```

## Example: reactive field logic

```ts
const form = new DeclarativeForm({
  fields: [
    {
      name: 'source',
      kind: 'select',
      displayName: 'Source',
      options: ['GitHub', 'GitLab'],
      defaultValue: 'GitHub',
    },
    {
      name: 'token',
      displayName: 'Token',
      type: 'password',
      isActive: ({ data }) => data['source'] === 'GitLab',
    },
    {
      name: 'repo',
      kind: 'select',
      displayName: 'Repository',
      reloadOnChangeOf: ['source'],
      options: async ({ data }) => {
        const source = String(data['source'] ?? 'GitHub');
        return [{ value: `${source}-repo`, label: `${source} repo` }];
      },
    },
  ],
  onConfirm: (values) => console.log(values),
});
```

This is the sort of behavior the library is designed to make practical without building a lot of custom event wiring.

## Documentation

Full documentation is at **[wolfoo2931.github.io/declarative-forms](https://wolfoo2931.github.io/declarative-forms/)**:

- [Getting started](https://wolfoo2931.github.io/declarative-forms/guide/getting-started)
- [Field kinds](https://wolfoo2931.github.io/declarative-forms/guide/fields/) — the ten built-in kinds
- [Reactivity](https://wolfoo2931.github.io/declarative-forms/guide/reactivity) — `isActive`, `reloadOnChangeOf`, computed fields
- [API reference](https://wolfoo2931.github.io/declarative-forms/reference/api)
- [Migrating from v1](https://wolfoo2931.github.io/declarative-forms/migration-v1)

## Status and limitations

Worth knowing before you adopt it:

- **Accessibility is a work in progress.** Labels, ids and focusable buttons are correct; dialog semantics, combobox ARIA and keyboard-reachable checkboxes are not there yet. The [accessibility page](https://wolfoo2931.github.io/declarative-forms/accessibility) lists every known gap.
- **There is no validation framework.** `isActive` handles conditional fields and button predicates gate submission, but there is no rule engine or error-message system.
- **The rendered DOM is a frozen contract.** Class names, ids and structure are stable across the v1 → v2 rewrite, so existing stylesheets keep working. See the [DOM contract](https://wolfoo2931.github.io/declarative-forms/dom-contract).

## Summary

`declarative-forms` is best thought of as a declarative form runtime for web dialogs and tool-like workflows.

It is for the cases where the main job is not “build another UI component,” but “ask the user for structured data.” You define what needs to be collected, and the library handles the front-end work to gather it: field rendering, behavior, defaults, dynamic changes, nested records, modal stacking, and workflow handling.

That is the core difference: instead of writing front-end code for every form interaction, you describe the data and rules, and the runtime takes care of the responsibilities that usually consume most of the work in form-heavy interfaces.
