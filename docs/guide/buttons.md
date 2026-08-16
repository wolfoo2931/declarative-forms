# Buttons

By default a form gets a single **OK** button that runs `onConfirm` and closes.

```ts
new DeclarativeForm({
  fields,
  confirmLabel: 'Save', // rename the default button
  onConfirm: (values) => save(values),
});
```

For anything more, declare `buttons` — an object **keyed by the visible label**:

```ts
buttons: {
  'Save & Export': { action: (values) => saveAndExport(values) },
  Save: { action: (values) => save(values) },
}
```

Buttons render in declaration order into the dialog's lower bar.

::: tip `buttons` and `onConfirm` are independent
In v1, a single-button `buttons` map silently replaced `onConfirm`. In v2 they
are separate: if you declare `buttons`, `onConfirm` is not used. See
[Migrating from v1](/migration-v1#behaviour-changes).
:::

## Button options

| Option            | Type                                   | Notes                                                     |
| ----------------- | -------------------------------------- | --------------------------------------------------------- |
| `action`          | `(values) => unknown`                  | Runs on click. May be async                               |
| `id`              | `string`                               | DOM id — **required for `isActive`/`isVisible`**          |
| `class`           | `string`                               | Extra classes. `'secondary'` is styled by the default CSS |
| `isActive`        | `(ctx) => boolean \| Promise<boolean>` | Enable/disable                                            |
| `isVisible`       | `(ctx) => boolean \| Promise<boolean>` | Show/hide                                                 |
| `doNotCloseModal` | `boolean`                              | Run `action` without closing                              |

## An `id` is what opts a button into state management

::: warning No `id`, no predicates
`isActive` and `isVisible` are **skipped entirely** for a button without an
`id`. The button still renders and still works — it is simply never
state-managed. This is inherited v1 behaviour, kept deliberately.
:::

```ts
// Predicates run.
Export: { id: 'exportBtn', isActive: ({ data }) => !!data['format'], action: save }

// Predicate silently ignored.
Export: { isActive: ({ data }) => !!data['format'], action: save }
```

## Enabling and disabling

`isActive` receives `{ data, parentData, stackData }` and may be async:

<LiveForm mode="modal" open="Open a dialog with a gated button">

```ts
{
  fields: [{ name: 'email', displayName: 'Email' }],
  buttons: {
    Cancel: { id: 'cancelBtn', class: 'secondary', action: () => {} },
    Invite: {
      id: 'inviteBtn',
      isActive: ({ data }) => String(data['email'] ?? '').includes('@'),
      action: (values) => console.log('invited', values['email']),
    },
  },
}
```

</LiveForm>

The Invite button stays disabled until the address contains an `@`.

A disabled button gets the `disabled` class and the `disabled` attribute, and
ignores clicks.

Synchronous predicates are applied **immediately**, so buttons do not flicker as
you type. Only genuinely async predicates leave the button briefly in its
previous state while they resolve.

## Showing and hiding

`isVisible` receives the same context and toggles the `invisible` class. A
common pattern is a pair of buttons that swap:

```ts
buttons: {
  Continue: {
    id: 'continueBtn',
    isVisible: ({ data }) => !data['needsUpgrade'],
    action: proceed,
  },
  Upgrade: {
    id: 'upgradeBtn',
    isVisible: ({ data }) => !!data['needsUpgrade'],
    action: openBilling,
  },
}
```

## Async actions and the loading state

An `action` returning a promise is awaited. While it runs the button gains a
`loading-btn` class (a spinner in the default stylesheet) and further clicks are
ignored. Before the action runs, the form:

1. waits for any in-flight field work to settle;
2. re-runs every [`computed`](/guide/fields/computed) field.

So the values your action receives are complete:

```ts
buttons: {
  Invite: {
    id: 'inviteBtn',
    action: async (values) => {
      await api.invite(values['email'], values['userId']); // computed, resolved
    },
  },
}
```

## Buttons that do not close

For wizards and multi-step flows, `doNotCloseModal` runs the action and leaves
the dialog open:

```ts
buttons: {
  Back: { id: 'backBtn', class: 'secondary', doNotCloseModal: true, action: () => step(-1) },
  Next: { id: 'nextBtn', doNotCloseModal: true, action: () => step(1) },
  Finish: { id: 'finishBtn', action: (values) => save(values) },
}
```

See [Tabs](/guide/tabs#wizards) for the `step` helper.

## The Enter key

<kbd>Enter</kbd> confirms the topmost dialog **only when it has exactly one
button**. With two or more, there is no unambiguous default, so Enter does
nothing.

It also does nothing when the confirm button is currently disabled, and it never
confirms from inside a [`textarea`](/guide/fields/textarea#allownewlines-and-the-enter-key).

## Invoking an action yourself

Buttons are your own objects, so you can call an action directly — useful for
driving a dialog from a toolbar elsewhere in your app:

```ts
const buttons = {
  Export: { id: 'exportBtn', action: (values) => doExport(values) },
};

const form = new DeclarativeForm({ fields, buttons });

// later
buttons['Export'].action?.(form.getValues());
```

Note this bypasses the settle-and-recompute step that a real click performs. If
your form has computed fields, await them first:

```ts
await form.updateComputedFields();
buttons['Export'].action?.(form.getValues());
```

## Styling

Buttons are real `<button type="button">` elements carrying `.btn`, so they are
focusable and keyboard-operable. State classes: `.disabled`, `.invisible`,
`.loading-btn`, plus `.secondary` for a muted style. The dismiss control is
`.cancelBtn`.
