# Reactivity

This is the part that makes the library worth using. A descriptor is not a
static schema: most of its options can be **functions of the current form
data**, and the library re-evaluates them whenever anything changes.

There are four mechanisms, each for a different job:

| Mechanism                                                    | Question it answers                             |
| ------------------------------------------------------------ | ----------------------------------------------- |
| [`isActive`](#isactive-conditional-fields)                   | Should this field exist right now?              |
| [`reloadOnChangeOf`](#reloadonchangeof-dependent-async-data) | Which changes should re-fetch my options?       |
| [`compute`](/guide/fields/computed)                          | What value is derived from the others?          |
| [`onFormChange`](#onformchange-side-effects)                 | What side effect should run when things change? |

Plus the general [`Reactive<T>`](#reactive-options) options — `placeholder`,
`message`, `tab`, `defaultValue`, `suggested`.

## The update cycle

When a user types, picks an option, or you call `requestUpdate()`, the form:

1. reads current values;
2. compares them with the previous snapshot — **if nothing changed, it stops
   here**;
3. re-evaluates every field's `isActive` and recomputes the set of non-empty
   tabs;
4. calls each field's `onFormChange` and lets each field refresh itself
   (reactive placeholders, re-rendered messages, dependent option loads);
5. waits for any async work to settle;
6. notifies `subscribeOnInput` subscribers;
7. re-evaluates every button's `isActive` / `isVisible`.

The early exit in step 2 is why you can write expensive callbacks without
worrying about keystroke-rate churn.

## `isActive`: conditional fields

Return `false` and the field is hidden **and dropped from `getValues()`**:

```ts
{
  name: 'token',
  displayName: 'Access token',
  type: 'password',
  isActive: ({ data }) => data['source'] === 'GitLab',
}
```

```ts
form.getValues();
// source === 'GitHub'  →  { source: 'GitHub', activeTab: undefined }
// source === 'GitLab'  →  { source: 'GitLab', token: '', activeTab: undefined }
```

That omission is deliberate: a hidden field's value is almost never what you
want to submit, and `'field' in values` becomes a reliable test for
"did this apply?".

::: tip Hidden, not destroyed
The field keeps its DOM and its value; it is marked `inactive` and hidden by
CSS. Re-activating it restores what the user had typed.
:::

`isActive` must be **synchronous** — it runs for every field on every update.
For an async decision, compute a flag in a [`computed`](/guide/fields/computed)
field and branch on that.

## `reloadOnChangeOf`: dependent async data

List the field names whose changes should re-run this field's async work:

```ts
{ name: 'owner', displayName: 'Owner' },
{
  name: 'repo',
  kind: 'select',
  displayName: 'Repository',
  reloadOnChangeOf: ['owner'],
  options: async ({ data }) => fetchRepos(String(data['owner'])),
}
```

Without `reloadOnChangeOf`, an options function runs **once** at construction.
With it, the list reloads whenever a named dependency changes — and only then,
so unrelated typing does not trigger fetches.

### Stale responses are discarded

Each load claims a generation token. If the user keeps typing while a request is
in flight, the older response is **dropped** rather than overwriting the newer
options:

```
type "goo"  → request A starts (slow)
type "goog" → request B starts (fast), A is now stale
B resolves  → options shown
A resolves  → discarded
```

This is handled for you; you do not need to debounce for correctness. (You may
still want to debounce to spare your API.)

### Handling failures

```ts
{
  name: 'repo',
  displayName: 'Repository',
  tooltip: 'Pick a repository.',
  kind: 'select',
  options: async () => fetchRepos(),
  onOptionsError: ({ error }) => ({ level: 'error', text: String(error) }),
}
```

See [`select`](/guide/fields/select#handling-load-failures).

## `onFormChange`: side effects

Called on every update, after values settle. Use it for effects outside the
form — syncing a preview, persisting a draft:

```ts
{
  name: 'template',
  kind: 'select',
  options: templates,
  onFormChange: ({ data, trigger }) => {
    if (trigger?.name === 'template') applyTemplate(data['template']);
  },
}
```

`trigger` is the field whose input started the update, or `undefined` for a
programmatic refresh. Guarding on it prevents an effect from running on every
unrelated change.

::: warning Do not set form values here
Setting a value from `onFormChange` re-enters the update cycle. Use
[`computed`](/guide/fields/computed) for derived values instead; the library
guards against runaway loops but will throw if updates never settle.
:::

## Reactive options

These accept a literal or a function of the context:

```ts
{
  name: 'locator',
  placeholder: ({ data }) => `enter a ${String(data['kind'] ?? 'page')}`,
  defaultValue: () => String(new Date().getFullYear()),
  tab: ({ data }) => (data['mode'] === 'edit' ? 'Edit' : 'View'),
}
```

`message` and `suggested` work the same way. See the
[fields overview](/guide/fields/#reactive-t-literal-or-function).

## Awaiting the form

Because much of this is asynchronous, two methods let you wait:

```ts
await form.whenReady(); // initial options + defaults are applied
await form.updateComputedFields(); // computed fields have re-run
```

Button actions already await both, so you rarely need them outside tests or
programmatic value reads.

## Cross-form reactivity

Nested dialogs can read outward:

- **`ctx.parentData`** — the enclosing form's values, when this form is an
  [array entry](/guide/fields/array) or a sub-dialog.
- **`ctx.stackData`** — every open dialog's values, outermost first.

```ts
{
  name: 'affiliation',
  isActive: ({ parentData }) => parentData?.['kind'] === 'academic',
}
```

See [Modals & stacking](/guide/modals).
