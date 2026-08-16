# `textarea`

A multi-line `<textarea>`.

```ts
{ name: 'summary', kind: 'textarea', displayName: 'Summary' }
```

## Options

| Option          | Type               | Notes                                                       |
| --------------- | ------------------ | ----------------------------------------------------------- |
| `placeholder`   | `Reactive<string>` | Literal, or a function of the form context                  |
| `allowNewlines` | `boolean`          | Whether <kbd>Enter</kbd> inserts a newline. Default `false` |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## `allowNewlines` and the Enter key

This is the one option worth understanding properly, because the default is
probably not what you would guess.

In a dialog, <kbd>Enter</kbd> normally confirms. A textarea competes for that
key, so the behaviour is explicit:

| `allowNewlines`     | <kbd>Enter</kbd> inside the textarea                                            |
| ------------------- | ------------------------------------------------------------------------------- |
| `true`              | Inserts a newline                                                               |
| `false` _(default)_ | **Does nothing** — the newline is suppressed, and the dialog is _not_ confirmed |

The default deliberately does nothing rather than confirming. A textarea
usually means the user is mid-thought, and confirming a dialog out from under
someone who pressed Enter while writing is worse than ignoring the key.

```ts
// Long-form prose: let Enter do the obvious thing.
{ name: 'notes', kind: 'textarea', allowNewlines: true }

// A one-line-ish field that just needs room to wrap.
{ name: 'summary', kind: 'textarea' }
```

Note that <kbd>Enter</kbd> only ever confirms a dialog that has **exactly one
button**. In a multi-button dialog it is ignored everywhere, textarea or not —
see [Buttons](/guide/buttons#the-enter-key).

## Values

`getValue()` returns the current string, newlines included; the empty value is
`''`.
