# `checkbox`

A single checkbox with a caption.

<LiveForm>

```ts
{
  fields: [
    { name: 'agree', kind: 'checkbox', label: 'Send me release notes' },
    {
      name: 'terms',
      kind: 'checkbox',
      label: html('I accept the <a href="#" onclick="return false">terms</a>'),
    },
  ],
}
```

</LiveForm>

Note that the value is a real boolean, and that the second caption is wrapped in
[`html()`](/guide/security) so that its link is rendered as markup.

## Options

| Option  | Type         | Notes                                |
| ------- | ------------ | ------------------------------------ |
| `label` | `TextOrHtml` | Required. The caption beside the box |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## `label` vs. `displayName`

These are two different things, and a checkbox can have both:

- **`label`** is the caption _next to the box_: the thing the user agrees to.
- **`displayName`** is the label _above_ the field, as on any other field.

```ts
{
  name: 'terms',
  displayName: 'Legal',                       // heading above
  kind: 'checkbox',
  label: 'I accept the terms of service',     // beside the box
}
```

## Links inside the caption

Captions are rendered as **plain text** by default. If a caption contains a
link, mark it as HTML yourself:

```ts
import { html } from 'declarative-forms';

{
  name: 'terms',
  kind: 'checkbox',
  label: html('I accept the <a href="/terms">terms of service</a>'),
}
```

See [Text & HTML safety](/guide/security) for why you have to ask for HTML.

## Values

The value is a real **`boolean`**, not a string:

```ts
form.getValues()['agree']; // false
```

With `defaultValue: true` the box starts out checked. The string `'false'` is
treated as unchecked, which helps when values are stored as text and read back
later.

## Accessibility note

The caption is correctly connected to the input, so clicking it checks and
unchecks the box, and under the default stylesheet the input is a real focusable
control.

In [`classic.css`](/guide/theme#staying-on-the-classic-look) it is not: the
input is `visibility: hidden` and the visible box is drawn by a CSS
pseudo-element, which takes it **out of the keyboard tab order**. See
[Accessibility](/accessibility). If you are staying on the classic look and need
keyboard operation, use [`cards`](/guide/fields/cards) or a
[`select`](/guide/fields/select) with two options instead.
