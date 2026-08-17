# Validation

There is **no validation framework** here: no `required`, no rule objects, no
schema, nothing that turns a constraint into a message on your behalf. What
there is instead is the machinery to build exactly the check you need, in three
parts you wire yourself:

| Part             | Mechanism                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **When to run**  | [`onFormChange`](/guide/reactivity#onformchange-side-effects) and its `trigger`                                                   |
| **What to say**  | [`setTooltipError` and friends](#the-five-levels)                                                                                 |
| **What to gate** | a button's [`isActive`](/guide/buttons#enabling-and-disabling), or [`isValidRecord`](#validating-array-entries) for array entries |

That split is the thing to understand before writing any of it: **the message
and the gate are separate.** Calling `setTooltipError` colours a tooltip. It
does not disable anything, does not appear in `getValues()`, and the form will
happily confirm with every field in an error state unless you also gate it.

## The shape of a check

Write the rule once as a plain function, then use it twice — once to explain the
problem, once to block on it:

<LiveForm>

```ts
{
  fields: [
    {
      name: 'author',
      displayName: 'Authors',
      placeholder: 'Ada Lovelace and Alan Turing',
      tooltip: 'Separate several names with the word "and".',
      onFormChange: ({ data, form, trigger }) => {
        if (trigger?.name !== 'author') return;

        const value = String(data['author'] ?? '');
        if (value.trim() === '') form.resetTooltip('author');
        else if (value.includes(','))
          form.setTooltipError('author', 'Use "and" between names, not a comma.');
        else form.setTooltipSuccess('author', 'Looks good.');
      },
    },
    {
      name: 'year',
      displayName: 'Year',
      placeholder: '2026',
      tooltip: 'The publication year, four digits.',
      onFormChange: ({ data, form, trigger }) => {
        if (trigger?.name !== 'year') return;

        const value = String(data['year'] ?? '');
        if (value === '') form.resetTooltip('year');
        else if (!/^\d{4}$/.test(value))
          form.setTooltipWarning('year', 'Expected four digits, for example 2026.');
        else form.setTooltipSuccess('year', 'Looks good.');
      },
    },
  ],
  buttons: {
    Save: {
      id: 'saveBtn',
      isActive: ({ data }) =>
        !String(data['author'] ?? '').includes(',') &&
        /^\d{4}$/.test(String(data['year'] ?? '')),
    },
  },
}
```

</LiveForm>

Type a comma into Authors: the `?` turns into a red `!`, and Save goes dead. In
real code the two predicates would be one exported function called from both
places, so they cannot drift apart.

::: warning The field must declare a `tooltip`
`setTooltipError` and every related method are **silent no-ops** on a field
without a `tooltip` in its descriptor — there is no marker to write on, and no
warning is logged. If your message never appears, this is why. Give the field a
neutral `tooltip` describing what it wants, and let the check overwrite it.
:::

::: tip A button needs an `id`
Without one, `isActive` is never called and the gate silently does nothing. See
[Buttons](/guide/buttons#an-id-is-what-makes-a-button-managed).
:::

## Check only what the user touched

`onFormChange` runs on **every** field on **every** update, so an unguarded
check re-runs on each keystroke anywhere in the form. `trigger` is the field
whose input started the update — comparing against it is what keeps a check
local:

```ts
onFormChange: ({ trigger }) => {
  if (trigger?.name !== 'author') return;
  // …
},
```

`trigger` is `undefined` when the update came from code rather than from typing
(`requestUpdate()`, a programmatic `setValue`, the initial build). An early
return on `undefined` therefore also stops a form from opening pre-covered in
red before the user has done anything.

Because every field's handler runs on every update, one handler can serve the
whole form. That is often tidier than scattering checks across descriptors:

```ts
const validate = ({ data, form, trigger }) => {
  if (!trigger) return;
  switch (trigger.name) {
    case 'author': return checkAuthor(data, form);
    case 'title':  return checkTitle(data, form);
    case 'url':    return checkUrl(data, form);
  }
};

// attach `validate` to one field; it sees every change
{ name: 'author', tooltip: '…', onFormChange: validate }
```

## Asynchronous checks

For a check that has to ask a server — is this name taken, does this DOI exist —
show the pending state on the tooltip, then replace it with the verdict:

```ts
onFormChange: ({ data, form, trigger }) => {
  if (trigger?.name !== 'handle') return;

  const handle = String(data['handle'] ?? '');
  if (handle === '') return form.resetTooltip('handle');

  form.setTooltipLoading('handle', 'Checking availability…');

  void isAvailable(handle)
    .then((free) =>
      free
        ? form.setTooltipSuccess('handle', 'That handle is free.')
        : form.setTooltipError('handle', 'Taken. Pick another one.'),
    )
    .catch(() => form.setTooltipError('handle', 'Could not check right now.'));
},
```

::: warning Stale answers are your problem here
The library discards out-of-date [`options` loads](/guide/reactivity#out-of-date-answers-are-thrown-away)
for you. It does **not** know about promises you start yourself, so a slow
answer for `"ali"` can land after a fast one for `"alice"`. Capture the value
you validated and drop the result if it has moved on:

```ts
const checked = handle;
void isAvailable(checked).then((free) => {
  if (String(form.field('handle')?.getValue() ?? '') !== checked) return;
  // …
});
```

Throttling the handler helps with load, but it does not make the answers
ordered.
:::

Gating a button on an async check is a separate matter: a button's `isActive`
may itself be async, but it re-runs on every update, so have it read a flag
rather than repeat the request. A [`computed`](/guide/fields/computed) field is
the usual place to keep that flag.

## Filling fields in from a lookup

The other half of "validation" in practice is not rejecting input but
**replacing it**: the user pastes a DOI or a URL, and the form fills itself in.
This is the one legitimate reason to write values from `onFormChange`:

```ts
onFormChange: ({ data, form, trigger }) => {
  if (trigger?.name !== 'lookupId') return;

  form.setTooltipLoading('lookupId', 'Looking it up…');

  void fetchMetadata(String(data['lookupId'] ?? ''))
    .then((meta) => {
      form.setTooltipSuccess('lookupId', 'Filled in what could be found.');

      for (const [name, value] of Object.entries(meta)) {
        // The guard is what makes this safe: writing an unchanged value
        // would start another update cycle for nothing.
        if (data[name] !== value) form.field(name)?.setValue(value);
      }
    })
    .catch(() => form.setTooltipError('lookupId', 'Nothing found for that id.'));
},
```

::: danger Always guard the write
Every `setValue` starts the update cycle again, which calls `onFormChange`
again. Without the `data[name] !== value` check, that is an endless loop, and
the library will throw `form updates did not settle after 100 rounds` rather
than hang. For a value that is purely derived from other values, do not do this
at all — use a [`computed`](/guide/fields/computed) field.
:::

## The five levels

```ts
form.setTooltip(name, text, icon?, className?); // the raw one
form.setTooltipSuccess(name, text); // ✓, class `tooltip-success`
form.setTooltipWarning(name, text); //  !, class `tooltip-warning`
form.setTooltipError(name, text); //    !, class `tooltip-error`
form.setTooltipLoading(name, text); //     class `tooltip-loading`
form.resetTooltip(name); //             ?, back to the descriptor's own text
form.resetTooltips(['author', 'year']);
```

Use **error** for input that cannot be accepted, **warning** for input that is
suspicious but allowed, **success** to confirm that an expensive or async check
passed — a green tick on every valid field is noise. `resetTooltip` restores the
text the descriptor declared, which is why an empty field should reset rather
than go green.

The class names are part of the [DOM contract](/dom-contract#tooltips), so a
stylesheet written against v1 keeps working. Tooltip state is scoped to the
form, so two open dialogs with a same-named field no longer overwrite each
other's messages.

## Validating array entries

An [array](/guide/fields/array) entry is edited in its own dialog, and that
dialog has its own confirm button. `isValidRecord` gates it, so a half-filled
entry cannot be added:

```ts
{
  name: 'authors',
  kind: 'array',
  of: [ /* … */ ],
  isValidRecord: (entry) => String(entry['lastName'] ?? '').trim() !== '',
}
```

It runs on every change inside the entry dialog and may be asynchronous. It is
the one place where a validity predicate is a first-class descriptor option
rather than something you wire up. See [Arrays](/guide/arrays#validating-before-an-entry-can-be-added).

## What this deliberately does not do

- **No `required`, no rules, no schema.** Every constraint is code you write.
- **Field state is not collected.** There is no `form.errors` and no
  `form.isValid`. If you need one, derive it from the values.
- **An error does not gate anything by itself.** Wire the button too.
- **Tooltips are not announced.** No `aria-invalid`, no error-message
  association, no live region — the state change is visual only. This is a known
  gap, listed in [Accessibility](/accessibility#no-validation-semantics).
- **Nothing resets for you.** A tooltip left in the error state stays there
  until you call `resetTooltip`.
