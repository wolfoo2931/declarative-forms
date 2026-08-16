# `custom`

The escape hatch: **you render the content, the form manages the value.** Use
it for a colour picker, a map, a live preview, or any widget the built-in kinds
do not cover.

```ts
{
  name: 'preview',
  kind: 'custom',
  displayName: 'Preview',
  render: (ctx) => {
    ctx.element.textContent = `Exporting as ${String(ctx.data['format'])}`;
  },
}
```

## Options

| Option   | Type                           | Notes    |
| -------- | ------------------------------ | -------- |
| `render` | `(ctx: RenderContext) => void` | Required |

Plus everything in [the shared options](/guide/fields/#options-every-kind-accepts).

## The render context

`render` receives the usual [field context](/guide/fields/#the-context-object)
plus three things:

```ts
interface RenderContext extends FieldContext {
  element: HTMLElement; // render into this
  requestUpdate(force?: boolean): void; // re-run the form update cycle
  setValue(value: unknown): void; // set this field's value + update
}
```

`element` is owned by the field, so you may freely replace its children.

## It re-renders on every update

`render` is called once on mount and again on **every form update**. Write it as
a pure function of `ctx.data` rather than assuming it runs once:

```ts
{
  name: 'picker',
  kind: 'custom',
  render: (ctx) => {
    ctx.element.replaceChildren(); // idempotent: clear, then build

    for (const colour of ['red', 'green', 'blue']) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.style.background = colour;
      swatch.setAttribute('aria-label', colour);
      swatch.onclick = () => ctx.setValue(colour);
      ctx.element.appendChild(swatch);
    }
  },
}
```

::: warning Do not attach state to the element
Anything you hang on `element` survives re-renders only by accident. Keep state
in your own closure, or in the form value via `setValue`.
:::

## Setting values

`ctx.setValue(value)` stores the value **and** triggers a form update, so
dependent fields react immediately. The value keeps its type — it is not
coerced to a string.

If you mutate something outside the form's knowledge and need a refresh without
changing this field's value, call `ctx.requestUpdate()` instead. Pass `true` to
force an update even when nothing appears to have changed.

## Performance

Because `render` runs on every update, avoid rebuilding expensive DOM
unconditionally. Either diff cheaply:

```ts
render: (ctx) => {
  const next = String(ctx.data['title'] ?? '');
  if (ctx.element.textContent !== next) ctx.element.textContent = next;
},
```

…or build once into a stable child and update only its content.

## When to reach for a custom field kind instead

If you find yourself writing the same `custom` field in several forms, promote
it to a **registered kind** so it gets a proper descriptor type and can be
reused declaratively. See [Custom field kinds](/guide/custom-fields).
