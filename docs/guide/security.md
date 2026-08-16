# Text & HTML safety

Everything the library renders is treated as **plain text by default**. Markup
is opt-in, one value at a time, through the `html()` marker.

<LiveForm :values="false">

```ts
{
  fields: [
    {
      name: 'plain',
      kind: 'checkbox',
      label: 'Rendered literally, tags and all: <b>terms</b>',
    },
    {
      name: 'marked',
      kind: 'checkbox',
      label: html('Rendered as markup: <b>terms</b>'),
    },
  ],
}
```

</LiveForm>

## Why it works this way

v1 assigned caller-supplied strings to `innerHTML` in 21 places — labels,
messages, option text, checkbox captions, entry summaries. Any of those carrying
user data was an XSS vector, and nothing in the API signalled that.

v2 inverts the default. `setValue`-style content goes through `textContent`
unless it is explicitly wrapped, so the unsafe thing is the one you have to ask
for.

## Where `TextOrHtml` is accepted

`displayName`, `tooltip` text, checkbox `label`, `message`, `cards[].content`,
select option `label`, and the return value of `renderEntry`.

## Two ways to mark HTML

### Tagged template — escapes interpolations

This is the form you want for anything data-driven. Literal parts are trusted,
interpolated values are escaped:

```ts
const name = '<img src=x onerror=alert(1)>';

html`<b>${name}</b>`;
// → '<b>&lt;img src=x onerror=alert(1)&gt;</b>'
```

Nested `SafeHtml` passes through unescaped, so you can compose:

```ts
html`<p>${html('<em>note</em>')}: ${userText}</p>`;
```

### Plain call — trusts the whole string

Use only for markup you fully control:

```ts
html('<span class="dl-option-tag">Offline</span>');
```

::: danger Never wrap unvalidated input
`html(someUserString)` reintroduces exactly the vulnerability the default
prevents. If any part of the string comes from user data, a database, or an
API, use the tagged-template form.
:::

## A practical example

Rendering an entry summary that includes a user-supplied name:

```ts
// Unsafe — do not do this.
renderEntry: (entry) => html(`<b>${String(entry['name'])}</b>`),

// Safe — the name is escaped.
renderEntry: (entry) => html`<b>${entry['name']}</b>`,

// Also safe — no markup needed at all.
renderEntry: (entry) => String(entry['name']),
```

## Escaping manually

```ts
import { escapeHtml } from 'declarative-forms';

escapeHtml(`&<>"'`); // '&amp;&lt;&gt;&quot;&#39;'
```

## Checking a value

```ts
import { isSafeHtml } from 'declarative-forms';

isSafeHtml(html('<b>x</b>')); // true
isSafeHtml('<b>x</b>'); // false
```

The marker uses a global symbol, so values still register as safe when two
copies of the library end up in one bundle.

## What this does not cover

- **`custom` fields.** You own that DOM. If you assign `innerHTML` inside
  `render`, escaping is your responsibility — prefer `textContent`.
- **Attribute values.** `className`, `accept`, `type` and similar are passed
  through as-is; do not build them from user input.
- **URLs.** A `file` field stores whatever URL your `persistFile` returns; the
  library does not validate the scheme. Reject `javascript:` on your side.
