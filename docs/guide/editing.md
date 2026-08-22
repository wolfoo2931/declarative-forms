# Editing an object

[Asking for data](/guide/asking-for-data) covers half the job. The other half is
that most dialogs in a real application are not asking for a new record — they
are asking for a **changed** one.

`window.prompt()` had this from the start:

```js
const name = prompt('Your name?', user.name); // ← the value to start from
```

`ask` takes the same second argument, one record wide:

```ts
const updated = await ask(userFields, { defaultValues: user });
```

The dialog opens with `user` already in it, and resolves with the edited record —
or with `undefined` if the user dismissed it, exactly as the create call does.

<LiveForm mode="program" stage="top" open="Edit a user">

```ts
import { ask } from 'declarative-forms';

// The object you already have — straight out of your store, ID and all.
const user = { id: 42, name: 'Ada Lovelace', role: 'admin', createdAt: '1843-10-01' };

const changes = await ask(
  [
    { name: 'name', displayName: 'Name' },
    { name: 'role', kind: 'select', displayName: 'Role', options: ['admin', 'guest'] },
  ],
  { defaultValues: user, confirmLabel: 'Save' },
);

// `id` and `createdAt` had no field, so they are neither shown nor returned.
console.log(changes ? { ...user, ...changes } : 'cancelled');
```

</LiveForm>

## One field list, both directions

`defaultValues` is the only difference between creating and editing, so the
field list is written once and used twice:

```ts
const userFields = [
  { name: 'name', displayName: 'Name' },
  { name: 'role', kind: 'select', displayName: 'Role', options: ['admin', 'guest'] },
];

const created = await ask(userFields, { confirmLabel: 'Create' });
const edited = await ask(userFields, { defaultValues: user, confirmLabel: 'Save' });
```

That is the reason the record goes on the **call** rather than into the
descriptors: descriptors describe the shape of the thing, and the shape does not
change just because you happen to have one already.

## What gets seeded

Three rules, chosen so the objects you actually have can go in unedited:

| Rule                                      | What it means                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Keys naming no field are ignored**      | Pass the whole domain object — `id`, `createdAt`, `_rev`. No filtering, no picking, and nothing extra comes back out. |
| **It wins over `defaultValue`**           | A field's own default is the value for the create case; `defaultValues` overrides it for the edit case.               |
| **`undefined` falls back to the default** | A half-filled record behaves the way you would expect: the missing keys take the field's default.                     |

The override holds for async defaults too — a `defaultValue` that returns a
promise, or a `select` whose `options` load over the network, still ends up on
the seeded value rather than racing it.

Seeded values are in place before the first paint, so
[`isActive`](/guide/reactivity#isactive-conditional-fields) predicates reading them are
right immediately: a dialog that shows the _Journal_ field only for articles
opens with it already visible, not one frame later.

## Merging back

`getValues()` returns the fields you declared, and only those. That is what
makes "pass the whole object" safe, and it means the answer is a **patch**, not
a replacement:

```ts
const changes = await ask(userFields, { defaultValues: user });
if (changes) await save({ ...user, ...changes });
```

Spread the original first and the answer over it. Anything the form did not ask
about — the id, the timestamps, the fields on another tab of your own UI —
survives untouched.

::: tip Inactive fields drop out too
A field hidden by `isActive` is not in `getValues()`, by design: a dialog that
asks for a journal name only when the type is _Article_ should not report an
empty journal after you switch the type to _Book_. With the merge above, the
previous value survives; if you want it cleared instead, clear it explicitly.
:::

## Arrays and nested records

An [`array` field](/guide/fields/array) takes its list of records directly, so a
record with a list inside it needs no special handling:

```ts
const reference = {
  title: 'Notes on the Analytical Engine',
  authors: [{ first: 'Ada', last: 'Lovelace' }],
};

await ask(
  [
    { name: 'title', displayName: 'Title' },
    {
      name: 'authors',
      kind: 'array',
      displayName: 'Authors',
      of: [{ name: 'first' }, { name: 'last' }],
    },
  ],
  { defaultValues: reference },
);
```

The dialog opens with one author listed, and its ✎ button opens the entry dialog
already filled in. Entry dialogs are the same mechanism one level down: the
array field seeds each entry's fields from the entry being edited, and
[`mapFieldsOnEdit`](/guide/fields/array#editing-vs-adding) lets you adjust that
field list for the edit case.

## With the object API

`defaultValues` is a form option, not an `ask` option, so the object API takes
it in the same place as everything else:

```ts
const form = new DeclarativeForm({
  fields: userFields,
  defaultValues: user,
  confirmLabel: 'Save',
  onConfirm: (changes) => save({ ...user, ...changes }),
  onCancel: () => {},
});

form.openInModal();
```

## Seeding the descriptors by hand

Before `defaultValues` existed, the way to prefill was to copy the record onto
the descriptors:

```js
const seeded = fields.map((field) => ({
  ...field,
  defaultValue: record[field.name] ?? field.defaultValue,
}));
```

This still works — `defaultValue` is read from the descriptor you pass in, and
the library never writes back onto your objects. Reach for it when a value needs
per-field handling on the way in (a date reformatted, a null mapped to `''`) and
`defaultValues` for everything else. See
[Migrating from v1](/migration-v1#prefilling-from-an-object)
if you are coming from the old idiom.

## Next

- [Asking for data](/guide/asking-for-data) — the model this follows from
- [Reactivity](/guide/reactivity) — fields that depend on the values around them
- [`array` fields](/guide/fields/array) — lists of records, edited one dialog at a time
- [API reference](/reference/api#new-declarativeform-options) — every form option
