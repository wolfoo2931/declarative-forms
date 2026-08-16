# `textarea`

A multi-line `<textarea>`.

<LiveForm>

```ts
{
  fields: [
    {
      name: 'summary',
      kind: 'textarea',
      displayName: 'Summary',
      placeholder: 'Enter inserts a newline only when allowNewlines is set',
      allowNewlines: true,
    },
  ],
}
```

</LiveForm>

## Options

| Option          | Type               | Notes                                                       |
| --------------- | ------------------ | ----------------------------------------------------------- |
| `placeholder`   | `Reactive<string>` | Literal, or a function of the form context                  |
| `allowNewlines` | `boolean`          | Whether <kbd>Enter</kbd> inserts a newline. Default `false` |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## `allowNewlines` and the Enter key

This is the one option you should read carefully, because the default is
probably not what you expect.

In a dialog, <kbd>Enter</kbd> normally confirms. A textarea needs the same key,
so the rule is written out:

| `allowNewlines`     | <kbd>Enter</kbd> inside the textarea                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| `true`              | Inserts a line break                                                              |
| `false` _(default)_ | **Nothing happens**: no line break is inserted, and the dialog is _not_ confirmed |

The default does nothing on purpose, instead of confirming. A textarea usually
means the user is in the middle of writing. Closing the dialog under their hands
because they pressed <kbd>Enter</kbd> while writing is worse than ignoring the
key.

```ts
// Long-form prose: let Enter do the obvious thing.
{ name: 'notes', kind: 'textarea', allowNewlines: true }

// A mostly one-line field that only needs room to wrap.
{ name: 'summary', kind: 'textarea' }
```

Note that <kbd>Enter</kbd> only ever confirms a dialog that has **exactly one
button**. In a dialog with several buttons it is ignored everywhere, inside a
textarea or not. See [Buttons](/guide/buttons#the-enter-key).

## Values

`getValue()` returns the current text, including line breaks. The empty value is
`''`.
