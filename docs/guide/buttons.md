# Buttons

By default a form gets a single **OK** button that runs `onConfirm` and closes.

```ts
new DeclarativeForm({
  fields,
  confirmLabel: 'Save', // rename the default button
  onConfirm: (values) => save(values),
});
```

If you need more than that, declare `buttons`. It is an object whose **keys are
the visible labels**:

```ts
buttons: {
  'Save & Export': { action: (values) => saveAndExport(values) },
  Save: { action: (values) => save(values) },
}
```

The buttons are rendered into the lower bar of the dialog, in the order in which
you declare them.

::: tip `buttons` and `onConfirm` are independent
In v1, a `buttons` object with exactly one button quietly replaced `onConfirm`.
In v2 the two are separate: if you declare `buttons`, `onConfirm` is not used at
all. See [Migrating from v1](/migration-v1#behaviour-changes).
:::

## Button options

| Option            | Type                                   | Notes                                                     |
| ----------------- | -------------------------------------- | --------------------------------------------------------- |
| `action`          | `(values) => unknown`                  | Runs on click. May be async                               |
| `id`              | `string`                               | DOM id — **required for `isActive` and `isVisible`**      |
| `class`           | `string`                               | Extra classes. `'secondary'` is styled by the shipped CSS |
| `isActive`        | `(ctx) => boolean \| Promise<boolean>` | Enables or disables the button                            |
| `isVisible`       | `(ctx) => boolean \| Promise<boolean>` | Shows or hides the button                                 |
| `doNotCloseModal` | `boolean`                              | Runs `action` and leaves the dialog open                  |

## An `id` is what makes a button managed

::: warning No `id`, no `isActive` and no `isVisible`
For a button without an `id`, `isActive` and `isVisible` are **never called**.
The button is still rendered and still works; the library simply does not manage
its state. This comes from v1 and was kept on purpose.
:::

```ts
// The functions are called.
Export: { id: 'exportBtn', isActive: ({ data }) => !!data['format'], action: save }

// The function is ignored, without any warning.
Export: { isActive: ({ data }) => !!data['format'], action: save }
```

## Enabling and disabling

`isActive` receives `{ data, parentData, stackData }`, and may be asynchronous:

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

A disabled button gets the class `disabled` and the attribute `disabled`, and
ignores clicks.

A synchronous function is applied **immediately**, so buttons do not flicker
while you type. Only a truly asynchronous function leaves the button in its
previous state for a moment, until it returns.

## Showing and hiding

`isVisible` receives the same context and adds or removes the class `invisible`.
A common pattern is a pair of buttons that replace each other:

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

If an `action` returns a promise, the library waits for it. While it runs, the
button gets the class `loading-btn` (a spinner in the shipped stylesheet) and
further clicks are ignored. Before the action runs, the form:

1. waits until all work still running in the fields has finished;
2. runs every [`computed`](/guide/fields/computed) field again.

The values your action receives are therefore complete:

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

For wizards and other multi-step flows, `doNotCloseModal` runs the action and
keeps the dialog open:

```ts
buttons: {
  Back: { id: 'backBtn', class: 'secondary', doNotCloseModal: true, action: () => step(-1) },
  Next: { id: 'nextBtn', doNotCloseModal: true, action: () => step(1) },
  Finish: { id: 'finishBtn', action: (values) => save(values) },
}
```

See [Tabs](/guide/tabs#wizards) for the `step` helper.

## The Enter key

<kbd>Enter</kbd> confirms the topmost dialog **only if that dialog has exactly
one button**. With two or more buttons there is no obvious default, so
<kbd>Enter</kbd> does nothing.

It also does nothing while the confirm button is disabled, and it never confirms
from inside a
[`textarea`](/guide/fields/textarea#allownewlines-and-the-enter-key).

## Invoking an action yourself

The button objects are yours, so you can call an action directly. This is useful
if you want to control a dialog from a toolbar somewhere else in your app:

```ts
const buttons = {
  Export: { id: 'exportBtn', action: (values) => doExport(values) },
};

const form = new DeclarativeForm({ fields, buttons });

// later
buttons['Export'].action?.(form.getValues());
```

Note that this skips the waiting and recalculation that a real click does. If
your form has computed fields, wait for them first:

```ts
await form.updateComputedFields();
buttons['Export'].action?.(form.getValues());
```

## Styling

Buttons are real `<button type="button">` elements with the class `.btn`, so
they can be focused and used with the keyboard. The state classes are
`.disabled`, `.invisible` and `.loading-btn`; `.secondary` gives a quieter
style. The close button is `.cancelBtn`.
