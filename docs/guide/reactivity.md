# Reactivity

This is the part that makes the library worth using. A descriptor is not a
static schema. Most of its options can be **functions of the current form
data**, and the library runs them again whenever something changes.

There are five mechanisms, each for a different job:

| Mechanism                                                    | Question it answers                              |
| ------------------------------------------------------------ | ------------------------------------------------ |
| [`isActive`](#isactive-conditional-fields)                   | Should this field exist right now?               |
| [`reloadOnChangeOf`](#reloadonchangeof-dependent-async-data) | Which changes should reload my options?          |
| [`compute`](/guide/fields/computed)                          | Which value is calculated from the other values? |
| [`onFormChange`](#onformchange-side-effects)                 | What should happen elsewhere when values change? |
| [`setTooltipError`](/guide/validation)                       | What is wrong with what the user just typed?     |

On top of that, the general [`Reactive<T>`](#reactive-options) options accept a
function as well: `placeholder`, `message`, `tab`, `defaultValue` and
`suggested`.

## The update cycle

When the user types, picks an option, or you call `requestUpdate()`, the form:

1. reads the current values;
2. compares them with the previous ones — **if nothing changed, it stops here**;
3. runs every field's `isActive` again, and works out which tabs still have
   fields in them;
4. calls each field's `onFormChange` and lets each field refresh itself
   (placeholders that are functions, messages that are re-rendered, options that
   have to be reloaded);
5. waits for all asynchronous work to finish;
6. informs the `subscribeOnInput` subscribers;
7. runs every button's `isActive` and `isVisible` again.

Because of step 2, a callback that is expensive to run is not a problem: it does
not run once per keystroke, only when a value really changed.

## `isActive`: conditional fields

If `isActive` returns `false`, the field is hidden **and left out of
`getValues()`**. Change the source below to GitLab: the token field appears, and
the `token` key appears with it.

<LiveForm>

```ts
{
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
      displayName: 'Access token',
      type: 'password',
      isActive: ({ data }) => data['source'] === 'GitLab',
    },
  ],
}
```

</LiveForm>

```ts
form.getValues();
// source === 'GitHub'  →  { source: 'GitHub', activeTab: undefined }
// source === 'GitLab'  →  { source: 'GitLab', token: '', activeTab: undefined }
```

Leaving the key out is intentional. The value of a hidden field is almost never
what you want to submit, and it lets you use `'token' in values` as a reliable
test for "did this field apply?".

::: tip Hidden, not deleted
The field keeps its DOM element and its value. It only gets the class `inactive`
and is hidden by CSS. When it becomes active again, whatever the user typed is
still there.
:::

`isActive` must be **synchronous**, because it runs for every field on every
update. If the decision needs asynchronous work, calculate a flag in a
[`computed`](/guide/fields/computed) field and let `isActive` read that flag.

## `reloadOnChangeOf`: dependent async data

List the names of the fields whose changes should re-run this field's
asynchronous work. Edit the owner below and the repository list reloads. The
example waits on purpose, so that you can see the loading state:

<LiveForm>

```ts
{
  fields: [
    { name: 'owner', displayName: 'Owner', defaultValue: 'wolfoo2931' },
    {
      name: 'repo',
      kind: 'select',
      displayName: 'Repository',
      reloadOnChangeOf: ['owner'],
      options: async ({ data }) => {
        await new Promise((r) => setTimeout(r, 600));
        const owner = String(data['owner'] || 'nobody');
        return [`${owner}/declarative-forms`, `${owner}/notes`];
      },
    },
  ],
}
```

</LiveForm>

Without `reloadOnChangeOf`, an options function runs **once**, when the form is
built. With it, the list reloads whenever one of the named fields changes — and
only then, so typing in an unrelated field starts no requests.

### Out-of-date answers are thrown away

Every load is given a number. If the user keeps typing while a request is still
running, the older answer is **thrown away** instead of overwriting the newer
options:

```
type "goo"  → request A starts (slow)
type "goog" → request B starts (fast); A is now out of date
B answers   → its options are shown
A answers   → thrown away
```

The library does this for you, so you do not need a debounce to get correct
results. You may still want one to reduce the load on your API.

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

`onFormChange` is called on every update, once the values are final. Use it for
things that happen outside the form: updating a preview, saving a draft.

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

`trigger` is the field whose input started this update. It is `undefined` when
the update was started from code. Checking it stops your effect from running on
every unrelated change.

::: warning Guard any value you write from here
Setting a value inside `onFormChange` starts the update cycle again, which calls
`onFormChange` again. That is fine for the case it exists for — filling fields
in from a lookup — as long as you write only what actually changed:

```ts
if (data[name] !== value) form.field(name)?.setValue(value);
```

Without that guard it is an endless loop, and the library throws rather than
hangs. For a value derived purely from other values, do not write it at all —
use a [`computed`](/guide/fields/computed) field. See
[Validation](/guide/validation#filling-fields-in-from-a-lookup).
:::

## Validation

`onFormChange` plus `trigger` is also where per-field validation goes: run the
check, then report it with `form.setTooltipError(name, …)`. Because the message
and the submit gate are separate, this has a page of its own —
see [Validation](/guide/validation).

## Reactive options

These options accept either a fixed value or a function of the context:

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

Much of this happens asynchronously, so two methods let you wait for it:

```ts
await form.whenReady(); // initial options + defaults are applied
await form.updateComputedFields(); // computed fields have re-run
```

A button action already waits for both, so you rarely need these outside tests
or when you read the values from code.

## Cross-form reactivity

A nested dialog can read the values of the dialogs around it:

- **`ctx.parentData`** — the values of the surrounding form, when this form is
  an [array entry](/guide/fields/array) or a sub-dialog.
- **`ctx.stackData`** — the values of every open dialog, outermost first.

```ts
{
  name: 'affiliation',
  isActive: ({ parentData }) => parentData?.['kind'] === 'academic',
}
```

See [Modals & stacking](/guide/modals).
