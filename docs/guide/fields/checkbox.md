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

Note the value is a real boolean, and the second caption is wrapped in
[`html()`](/guide/security) so its link renders as markup.

## Options

| Option  | Type         | Notes                                |
| ------- | ------------ | ------------------------------------ |
| `label` | `TextOrHtml` | Required. The caption beside the box |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## `label` vs. `displayName`

They are different things and a checkbox can have both:

- **`label`** is the caption _next to the box_ — the thing being agreed to.
- **`displayName`** is the field label _above_ it, like any other field.

```ts
{
  name: 'terms',
  displayName: 'Legal',                       // heading above
  kind: 'checkbox',
  label: 'I accept the terms of service',     // beside the box
}
```

## Links inside the caption

Captions are rendered as **text** by default. For a caption containing a link,
mark it as HTML explicitly:

```ts
import { html } from 'declarative-forms';

{
  name: 'terms',
  kind: 'checkbox',
  label: html('I accept the <a href="/terms">terms of service</a>'),
}
```

See [Text & HTML safety](/guide/security) for why this is opt-in.

## Values

The value is a real **`boolean`**, not a string:

```ts
form.getValues()['agree']; // false
```

`defaultValue: true` starts it checked. Setting the string `'false'` is treated
as unchecked, which makes round-tripping serialised values less surprising.

## Accessibility note

The caption is correctly associated with the input, so clicking it toggles the
box. However, the input itself is currently `visibility: hidden` (the visible
box is drawn by a CSS pseudo-element), which takes it **out of the keyboard tab
order**. This is a known gap — see [Accessibility](/accessibility) — and is
scheduled to be fixed. If keyboard operability matters for your use case today,
prefer [`cards`](/guide/fields/cards) or a two-option
[`select`](/guide/fields/select).
