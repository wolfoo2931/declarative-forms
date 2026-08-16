# declarative-forms

**`window.prompt()` on steroids** — the same idea, without the one-string limit.

`prompt()` is the one form API the browser gives you for free: you ask for a
value, the browser draws the dialog, and you get the answer back. No markup, no
state, no layout. But it can only ask for a single string.

`declarative-forms` keeps that simplicity and removes the limit. You describe the
**record** you want — its fields, their kinds, and the rules between them — in a
descriptor that reads like JSON Schema, and you get a plain object back. In
between, the library draws the dialog, keeps every field up to date, loads
options from your API, manages nested records, tabs and stacked dialogs, and
re-evaluates everything as the values change. You never write a `<div>`, a piece
of form state, an `onChange` handler, or a line of layout.

Press the button below and try it: three tabs, an option list that reloads when
the team changes, a credits list, and a _Schedule…_ dialog that opens on top of
the first, with a third on top of that. **Values** shows the object you would
receive, updated as you type. Below the panel is the code that produces all of
it: the imports, the descriptors, and the call that opens the dialog, with
nothing left out. The button runs exactly that code, and none of it describes
rendering.

<LiveForm mode="program" stage="top" open="Open the release dialog">

```ts
import 'declarative-forms/styles.css';
import { DeclarativeForm, html } from 'declarative-forms';

// Pretend this is your API. Any options function may be async.
const reviewersOf = async (team) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (
    {
      design: ['Ada Lovelace', 'Grace Hopper', 'Lin Chen'],
      infra: ['Radia Perlman', 'Alan Turing'],
    }[team] ?? []
  );
};

// A button in the dialog below opens this one, so it appears on top of it.
// Its own list then opens a third dialog on top of that.
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
        // The values of every open dialog, outermost first.
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
    // `tab` groups fields. The tab bar builds itself, and hides a tab when
    // none of its fields is active.
    {
      name: 'title',
      displayName: 'Release title',
      tab: 'Notes',
      placeholder: 'Sunrise 2.0',
      tooltip: 'Shown at the top of the changelog',
    },
    { name: 'notes', kind: 'textarea', displayName: 'What changed', tab: 'Notes' },
    {
      // Derived, and never shown. Recalculated before any button action runs.
      // Watch `slug` in the values panel above.
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
      // A hidden field disappears from getValues() completely.
      isActive: ({ data }) => data['visibility'] === 'team',
    },
    {
      name: 'reviewers',
      kind: 'select',
      multiple: true,
      displayName: 'Sign-off from',
      tab: 'Audience',
      isActive: ({ data }) => data['visibility'] === 'team',
      reloadOnChangeOf: ['team'], // reloads, and ignores out-of-date answers
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
      // The button stays disabled until this returns true. May be async.
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

Every behaviour above is declared in that object. You implement none of it:

- **[Tabs](/guide/tabs)** — one `tab` key per field. The tab bar builds itself,
  and hides a tab when none of its fields is active.
- **[Conditional fields](/guide/reactivity#isactive-conditional-fields)** —
  `isActive` hides _Which team_ and _Sign-off from_ when the release is public,
  and removes them from the values.
- **[Async, dependent options](/guide/reactivity#reloadonchangeof-dependent-async-data)** —
  `reloadOnChangeOf: ['team']` reloads the reviewer list. If an older request
  answers after a newer one, the library throws the older answer away.
- **[Derived values](/guide/fields/computed)** — `slug` follows the title, and is
  recalculated before any button action runs.
- **[Nested records](/guide/fields/array)** — the credits list opens one dialog
  per entry, and offers a ready-made entry you can accept with a checkbox.
- **[Stacked dialogs](/guide/modals)** — _Schedule…_ opens a second dialog and
  leaves the first one open behind it; the _Never publish during_ list opens a
  third. With `stackData`, a dialog can read the values of the dialogs below it:
  the recap message reads the title from the very first one.
- **[Button state](/guide/buttons)** — _Publish_ stays disabled until there is a
  title and at least one credit.

Two kinds are not in the demo but work the same way:
[file](/guide/fields/file) uploads, and [custom](/guide/fields/custom) fields
that render anything you write.

## How it differs from other form libraries

**vs. React Hook Form, Formik, VeeValidate.** Those are _state_ libraries, and
each one is tied to a single framework. You still write every input, label and
layout yourself. `declarative-forms` renders the whole dialog and needs no
framework: it is plain DOM plus one web component, so you can use it from React,
Vue, Svelte, or a plain `<script>` tag.

**vs. JSON-Schema renderers (react-jsonschema-form, JSONForms, formily).**
Those build a form from a _static_ data schema. Here the descriptor is **live**:
`options`, `isActive`, `defaultValue`, `placeholder`, `message`, `tab` and
`compute` may each be a function of the current form data, and
[`reloadOnChangeOf`](/guide/reactivity) says which field depends on which.
Fields that react to other fields, and options loaded from a server, are the
main feature here — not something bolted on afterwards.

**vs. `<dialog>` plus a UI kit.** With those you would build the following
yourself. Here they are included: stacked dialogs, where a child dialog can read
its parent's data; tabs that disappear once they are empty; buttons whose
enabled and visible state is a function of the form data, and may be async; and
repeating sub-forms with suggestions the user can accept or reject.

**No runtime dependencies.** No build step required.

## Where it fits best

It fits best in **settings and metadata dialogs for document-based apps**: many
optional fields, grouped into tabs, where the available choices depend on what
the user has already selected. For example:

- admin panels and settings dialogs
- configuration flows with conditions and dependencies
- modal wizards with several steps
- forms whose options are loaded from a server and depend on other fields
- editing lists whose entries are records of their own
- internal tools that need a data-driven UI without depending on a framework

## Where it does not fit

Said plainly, so you can rule it out quickly:

- It is **not a general-purpose form library**. It renders one fixed layout. If
  you need full control over the markup, use a state library instead.
- It has **no validation framework**. `isActive` hides fields, and
  `isValidRecord` and a button's `isActive` control when the form can be
  submitted — but there are no validation rules, no error messages, and no
  schema validation.
- **Accessibility is not finished.** Labels, ids and focusable buttons are
  correct. Dialog semantics, ARIA for the combobox, and checkboxes you can reach
  with the keyboard are still missing. Read [Accessibility](/accessibility) for
  the full list before you use it where accessibility conformance is required.

## Next

- [Getting started](/guide/getting-started) — install and build your first form
- [Field kinds](/guide/fields/) — the ten built-in kinds
- [Reactivity](/guide/reactivity) — the part that makes this library worth using
- [Migrating from v1](/migration-v1) — if you still use the pre-TypeScript
  version
