# Arrays & suggestions

The [`array`](/guide/fields/array) kind edits a list of sub-records. This page
covers the patterns that go beyond the basic setup.

## The shape

<LiveForm>

```ts
{
  fields: [
    {
      name: 'authors',
      kind: 'array',
      displayName: 'Authors',
      newButtonLabel: 'Add Author',
      of: [
        { name: 'preName', displayName: 'First name' },
        { name: 'lastName', displayName: 'Last name' },
        {
          name: 'role',
          kind: 'select',
          displayName: 'Role',
          options: ['Author', 'Editor', 'Reviewer'],
          defaultValue: 'Author',
        },
      ],
      renderEntry: (entry) =>
        `${String(entry['preName'])} ${String(entry['lastName'])} (${String(entry['role'])})`,
      isValidRecord: (entry) => String(entry['lastName'] ?? '').trim().length > 0,
      suggested: [
        { preName: 'Ada', lastName: 'Lovelace', role: 'Author' },
        { preName: 'Grace', lastName: 'Hopper', role: 'Reviewer' },
      ],
    },
  ],
}
```

</LiveForm>

The rendered list is: optional suggestions, then one row per entry with **Edit**
and **Remove**, then the add button.

## Entries are full forms

`of` is an ordinary array of field descriptors, so an entry dialog can use
**any** field kind — including another `array`. Nesting works, and each level
gets its own dialog on the [modal stack](/guide/modals#stacking).

```ts
of: [
  { name: 'name', displayName: 'Name' },
  {
    name: 'affiliations',
    kind: 'array',
    of: [{ name: 'institution', displayName: 'Institution' }],
  },
];
```

Entry dialogs get their own [tabs](/guide/tabs), reactivity, and buttons — they
are not a reduced form.

## Reaching the parent

Inside an entry, `ctx.parentData` is the enclosing form's values:

```ts
of: [
  {
    name: 'affiliation',
    displayName: 'Affiliation',
    isActive: ({ parentData }) => parentData?.['kind'] === 'academic',
  },
];
```

For deeper nesting, `ctx.stackData` lists every open dialog's values, outermost
first.

## Add vs. edit

Editing seeds each field with the entry's current value. To change the field set
for the edit case, use `mapFieldsOnEdit`:

```ts
mapFieldsOnEdit: (fields, entry) => [
  ...fields.filter((f) => f.name !== 'kind'),
  { name: 'kindLabel', kind: 'message', message: `Kind: ${String(entry['kind'])}` },
],
```

Any descriptor callback can also branch on `ctx.isEditingArrayEntry`:

```ts
{
  name: 'preName',
  tab: ({ isEditingArrayEntry }) => (isEditingArrayEntry ? 'Edit author' : 'New author'),
}
```

## Validating before an entry can be added

`isValidRecord` gates the entry dialog's confirm button. It runs on every change
within that dialog and may be async:

```ts
isValidRecord: async (entry) => {
  const email = String(entry['email'] ?? '');
  return email.includes('@') && !(await isAlreadyInvited(email));
},
```

It also receives the outer field context as a second argument, if you need the
parent form's data to decide.

## Suggestions

Suggestions are pre-filled entries offered as checkboxes above the list. They
suit "we already know some likely answers" cases — collaborators on a document,
authors from an imported file:

```ts
{
  name: 'authors',
  kind: 'array',
  of: authorFields,
  suggested: [
    { preName: 'Ada', lastName: 'Lovelace', role: 'Author' },
    { preName: 'Grace', lastName: 'Hopper', role: 'Reviewer' },
  ],
}
```

Ticking one adds it to the value; unticking removes it. They are **merged into
the same array** as manually added entries, so `getValues()` gives you one
uniform list.

Suggestions can be computed from the form:

```ts
suggested: ({ data, parentData }) =>
  knownCollaborators(parentData?.['documentId'])
    .filter((person) => person.role === data['filterRole']),
```

Each suggestion is summarised with the same `renderEntry` as real entries, so
the list reads consistently.

### Deduplication

A suggestion identical to an entry the user already added by hand is **not**
added twice. Comparison is structural, so an accepted suggestion that the user
then edits is treated as a distinct record.

## Reacting to list changes

`onChange` fires after an entry is added, edited or removed, once pending work
has settled:

```ts
onChange: (values) => {
  autosave(values);
},
```

It receives the **whole form's** values, not just the array, so you can persist
in one step.

## Styling

The default stylesheet covers the list; the hooks are
`.dl-form-array-of-entry`, its `.edit-array-of-btn` / `.delete-array-of-btn`,
the `.dl-form-array-of-add-entry` button, and
`.dl-form-array-of-suggestion` inside `.dl-form-array-suggested-container`.

Each entry dialog also carries a class naming its field —
`.form-for-array-of-authors` — so you can style or target one specific list's
dialog. See the [DOM contract](/dom-contract).
