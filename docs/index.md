# declarative-forms

A **declarative form runtime** for the web. You describe the data you need and
the rules around it; the library renders the dialog, wires the updates, loads
async option sets, manages nested records, tabs and modal stacks, and keeps
everything in sync as values change.

The snippet below is a **complete program** — the imports, the descriptors and
the call that opens the dialog, nothing omitted — and it is running live on this
page. Press the button and work through it: three tabs, an option list that
reloads when the team changes, a credits list, and a schedule dialog that stacks
on top with a dialog of its own on top of that.

<LiveForm mode="program" open="Open the release dialog">

```ts
import 'declarative-forms/theme.css';
import { DeclarativeForm, html } from 'declarative-forms';

// Stands in for your API. Any options function may be async.
const reviewersOf = async (team) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (
    {
      design: ['Ada Lovelace', 'Grace Hopper', 'Lin Chen'],
      infra: ['Radia Perlman', 'Alan Turing'],
    }[team] ?? []
  );
};

// Opened from a button of the dialog below it, so it stacks on top of it — and
// its own list opens a third dialog on top of that.
const openSchedule = (release) =>
  new DeclarativeForm({
    fields: [
      {
        name: 'when',
        kind: 'cards',
        displayName: 'Publish',
        defaultValue: 'now',
        cards: [
          { value: 'now', content: html('<b>Immediately</b><br>on confirm') },
          { value: 'at', content: html('<b>At a set time</b><br>your timezone') },
        ],
      },
      {
        name: 'at',
        type: 'datetime-local',
        displayName: 'Moment',
        isActive: ({ data }) => data['when'] === 'at',
      },
      {
        name: 'freezes',
        kind: 'array',
        displayName: 'Never publish during',
        newButtonLabel: 'Add window',
        of: [
          { name: 'reason', displayName: 'Reason', placeholder: 'Conference' },
          { name: 'until', type: 'date', displayName: 'Until' },
        ],
        renderEntry: (entry) => `${entry['reason']} — until ${entry['until']}`,
        isValidRecord: (entry) => Boolean(entry['reason'] && entry['until']),
        suggested: [{ reason: 'Company all-hands', until: '2026-09-01' }],
      },
      {
        name: 'recap',
        kind: 'message',
        // Every open dialog's values, outermost first.
        message: ({ data, stackData }) =>
          html(`Publishing <b>${stackData[0]['title'] || 'this release'}</b>
                ${data['when'] === 'now' ? 'as soon as you confirm' : 'later'}.`),
      },
    ],
    buttons: {
      Apply: {
        id: 'apply',
        action: (values) => {
          const at = values['when'] === 'now' ? 'Immediately' : values['at'];
          release.field('publishAt').setValue(at);
          void release.update();
        },
      },
    },
    onCancel: () => {},
  }).openInModal();

const release = new DeclarativeForm({
  fields: [
    // `tab` groups fields. The strip renders itself, and hides a tab that has
    // no active fields left.
    {
      name: 'title',
      displayName: 'Release title',
      tab: 'Notes',
      placeholder: 'Sunrise 2.0',
      tooltip: 'Shown at the top of the changelog',
    },
    { name: 'notes', kind: 'textarea', displayName: 'What changed', tab: 'Notes' },
    {
      // Derived and invisible; recomputed before any button action runs.
      // Watch `slug` in the values panel below.
      name: 'slug',
      kind: 'computed',
      compute: ({ data }) =>
        '/releases/' +
        String(data['title'] || 'untitled')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
    },
    {
      name: 'publishAt',
      displayName: 'Publish at',
      tab: 'Notes',
      defaultValue: 'Immediately',
    },
    {
      name: 'visibility',
      kind: 'select',
      displayName: 'Visible to',
      tab: 'Audience',
      defaultValue: 'team',
      options: [
        { value: 'team', label: 'One team' },
        { value: 'company', label: 'Everyone here' },
        { value: 'public', label: 'The public' },
      ],
    },
    {
      name: 'team',
      kind: 'select',
      displayName: 'Which team',
      tab: 'Audience',
      defaultValue: 'design',
      options: [
        { value: 'design', label: 'Design' },
        { value: 'infra', label: 'Infrastructure' },
      ],
      // Hidden fields drop out of getValues() entirely.
      isActive: ({ data }) => data['visibility'] === 'team',
    },
    {
      name: 'reviewers',
      kind: 'select',
      multiple: true,
      displayName: 'Sign-off from',
      tab: 'Audience',
      isActive: ({ data }) => data['visibility'] === 'team',
      reloadOnChangeOf: ['team'], // refetches, and drops stale responses
      options: ({ data }) => reviewersOf(data['team']),
    },
    {
      name: 'announce',
      kind: 'checkbox',
      tab: 'Audience',
      label: 'Post to #releases when it goes live',
    },
    {
      name: 'credits',
      kind: 'array',
      displayName: 'Credits',
      tab: 'Credits',
      newButtonLabel: 'Add person',
      of: [
        { name: 'who', displayName: 'Name' },
        {
          name: 'role',
          kind: 'select',
          displayName: 'Role',
          options: ['Author', 'Reviewer', 'Release manager'],
          defaultValue: 'Author',
        },
      ],
      renderEntry: (entry) => `${entry['who']} — ${entry['role']}`,
      isValidRecord: (entry) => String(entry['who'] ?? '').trim() !== '',
      suggested: [{ who: 'Ada Lovelace', role: 'Author' }],
    },
  ],
  buttons: {
    Publish: {
      id: 'publish',
      // Disabled until this holds. May return a promise.
      isActive: ({ data }) => Boolean(data['title']) && data['credits']?.length > 0,
      action: (values) => console.log(values),
    },
    'Schedule…': {
      id: 'schedule',
      class: 'secondary',
      doNotCloseModal: true, // this dialog stays open underneath
      action: () => openSchedule(release),
    },
  },
  onCancel: () => {},
});

release.openInModal();
```

</LiveForm>

Every behaviour in there is declared, not wired:

- **[Tabs](/guide/tabs)** — one `tab` key per field. The strip renders itself and
  hides a tab once nothing in it is active.
- **[Conditional fields](/guide/reactivity#isactive-conditional-fields)** —
  `isActive` drops _Which team_ and _Sign-off from_ for a public release, and
  removes them from the values.
- **[Async, dependent options](/guide/reactivity#reloadonchangeof-dependent-async-data)** —
  `reloadOnChangeOf: ['team']` refetches the reviewer list, and stale responses
  are discarded for you.
- **[Derived values](/guide/fields/computed)** — `slug` follows the title and is
  recomputed before any action runs.
- **[Nested records](/guide/fields/array)** — the credits list opens a dialog per
  entry, with a suggestion you can tick.
- **[Stacked dialogs](/guide/modals)** — _Schedule…_ opens a second dialog and
  keeps the first one open under it; its blackout list opens a third. `stackData`
  reads the title from the dialog at the bottom of the stack.
- **[Button state](/guide/buttons)** — _Publish_ stays disabled until there is a
  title and at least one credit.

Not in the demo, but built the same way: [file](/guide/fields/file) uploads and
[custom](/guide/fields/custom) fields that render whatever you like.

No markup, no state to hold, no framework to adopt.

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
