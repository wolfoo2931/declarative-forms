# `file`

A file picker with an image preview.

```ts
{ name: 'cover', kind: 'file', displayName: 'Cover image', accept: 'image/png, image/jpeg' }
```

## Options

| Option   | Type     | Notes                          |
| -------- | -------- | ------------------------------ |
| `accept` | `string` | Maps to the `accept` attribute |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## The value is a URL, not a `File`

This is the important design decision. The field's value is **the URL your app
returns**, not the browser's `File` object. The dialog stores a reference; your
app decides where the bytes live.

That requires a form-level `persistFile` handler:

```ts
new DeclarativeForm({
  fields: [{ name: 'cover', kind: 'file', displayName: 'Cover' }],
  persistFile: async (file) => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body });
    return (await res.json()).url; // string or URL
  },
  onConfirm: (values) => {
    values['cover']; // 'https://cdn.example.com/abc.png'
  },
});
```

`persistFile` may return a `string` or a `URL`. While it runs, the preview shows
a loading state.

::: warning A file field without `persistFile` throws
There is no sensible default — the library cannot know where your files should
go. Picking a file on a form with no handler raises an error explaining this.
:::

## The same file is only uploaded once

Results are cached per `File` object, so picking the same file into two fields
uploads it once. A **failed** upload is not cached, so the next attempt retries
properly.

## Handling upload failures

A rejected `persistFile` clears the field and dispatches a cancelable
`dl-error` event, so you can show your own message:

```ts
form.dom.addEventListener('dl-error', (event) => {
  const { field, error } = (event as CustomEvent).detail;
  showToast(`Upload failed for ${field}`);
  event.preventDefault(); // suppress the console fallback
});
```

If nothing calls `preventDefault()`, the error is logged to the console rather
than disappearing silently. It is deliberately not thrown: the upload runs from
an event handler, where a throw would only produce an unhandled rejection.

## Clearing

The preview carries a remove button. Programmatically, set an empty value:

```ts
form.field('cover')?.setValue('');
```

## Values

`getValue()` returns the stored URL as a string, or `''` when nothing is
selected.
