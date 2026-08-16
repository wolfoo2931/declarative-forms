# Modals & stacking

A form can be shown as a floating dialog or embedded inline in the page. Every
other demo on this site is embedded; this one is a real dialog, and opening a
second one from inside it shows the stack in action.

<LiveForm mode="modal" open="Open a stacked dialog">

```ts
{
  fields: [
    { name: 'title', displayName: 'Title', defaultValue: 'Parent dialog' },
    {
      name: 'people',
      kind: 'array',
      displayName: 'People (opens a second dialog)',
      of: [{ name: 'name', displayName: 'Name' }],
    },
  ],
}
```

</LiveForm>

## As a modal

```ts
const modal = form.openInModal();
```

The dialog is appended to `document.body` and returned as its outer
`div.dl-modal` element.

::: warning It returns an element, not a controller
`openInModal()` returns the raw DOM element, deliberately. Do not call
`.close()` on it — that method does not exist. Use `form.close()`,
`form.cancel()` or `form.remove()`. (This return type is
[frozen](/dom-contract) for backwards compatibility.)
:::

Add classes at open time:

```ts
form.openInModal({
  classNames: ['largeModal'], // added to the inner .modal
  wrapperClassNames: ['myOverlay'], // added to the outer .dl-modal
});
```

Calling `openInModal()` again reuses the same element rather than creating a
second dialog.

## Embedded in the page

```ts
form.appendInElement(document.querySelector('#panel'));
```

The wrapper gains a `noModalDialog` class, which drops the backdrop and the
centred-dialog layout. The important behavioural difference: **confirming an
embedded form runs your callback but does not remove it from the page**, since
an inline panel should stay put.

Combine with `subscribeOnInput` for a live-updating panel:

```ts
form.appendInElement(host);
form.subscribeOnInput((values) => renderPreview(values));
```

## Closing

| Method           | Runs `onConfirm`? | Runs `onCancel`? | Removes the dialog?         |
| ---------------- | ----------------- | ---------------- | --------------------------- |
| `close(action?)` | yes (or `action`) | no               | yes, unless embedded        |
| `cancel()`       | no                | yes              | yes                         |
| `remove()`       | no                | no               | yes                         |
| `destroy()`      | no                | no               | yes, and releases listeners |

```ts
await form.close(); // confirm
await form.close(customAction); // confirm with a different callback
form.cancel(); // dismiss
```

`close()` is async because your callback may be — it awaits the callback before
tearing the dialog down.

Use `destroy()` when discarding an **embedded** form for good; it also detaches
tooltips and cancels pending work.

## Dismissable or not

The presence of `onCancel` decides whether the dialog can be abandoned:

```ts
// Dismissable: renders a ✕ button, Escape works.
new DeclarativeForm({ fields, onConfirm, onCancel: () => {} });

// Not dismissable: no ✕, Escape is ignored.
new DeclarativeForm({ fields, onConfirm });
```

There is no separate flag — if there is no cancel handler, there is nothing
sensible to do on dismissal, so the affordance is not offered.

## Stacking

Opening a dialog while another is open **stacks** them. The covered dialog is
hidden (class `dl-modal-hidden`, not removed) and is revealed again when the top
one closes. Escape and Enter always address the topmost dialog only.

The dialog on top also carries `dl-modal-stacked`, and a dialog revealed again
carries `dl-modal-restored`. Both mean "the backdrop was already on screen": a
custom theme that animates `.dl-modal` in should skip the animation on these,
or the page flashes through while one backdrop replaces the other.

This is what makes [array entry dialogs](/guide/fields/array) work, and you can
use it directly:

```ts
const child = new DeclarativeForm({
  fields: [{ name: 'reason', displayName: 'Reason' }],
  onConfirm: (values) => applyReason(values['reason']),
  onCancel: () => {},
});

child.openInModal();
```

### Reading outward

A stacked dialog can see the values beneath it:

```ts
{
  name: 'detail',
  isActive: ({ stackData }) => stackData.some((d) => d['mode'] === 'expert'),
}
```

- **`ctx.stackData`** — every open dialog's values, outermost first.
- **`ctx.parentData`** — the immediately enclosing form, for nested forms
  created by the library (array entries).

### Keyboard

- **Escape** dismisses the topmost dialog, if it has an `onCancel`.
- **Enter** confirms the topmost dialog **only when it has exactly one button**.
  See [Buttons](/guide/buttons#the-enter-key).

The global key listener is attached when the first dialog opens and removed when
the last one closes — importing the library on its own registers nothing, which
keeps it safe for server-side rendering.

## Hiding without closing

```ts
form.hide(); // adds dl-modal-hidden
form.show();
```

Used internally by the stack; occasionally useful when handing the screen to
something else briefly.
