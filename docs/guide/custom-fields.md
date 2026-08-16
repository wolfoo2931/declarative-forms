# Custom field kinds

A one-off widget belongs in a [`custom`](/guide/fields/custom) field. When you
find yourself writing the same one in several forms, promote it to a
**registered kind** — it gets a real descriptor type and becomes usable
declaratively.

```ts
{ name: 'score', kind: 'rating', max: 5 }
```

## Write the field class

Extend `Field` and implement three members:

```ts
import { Field } from 'declarative-forms';
import type { BaseFieldDescriptor } from 'declarative-forms';

export interface RatingFieldDescriptor extends BaseFieldDescriptor {
  kind: 'rating';
  max?: number;
}

export class RatingField extends Field<RatingFieldDescriptor> {
  private value = 0;
  private buttons: HTMLButtonElement[] = [];

  protected createControl(): HTMLElement {
    const container = document.createElement('div');
    container.classList.add('rating-field');

    for (let i = 1; i <= (this.descriptor.max ?? 5); i++) {
      const star = document.createElement('button');
      star.type = 'button';
      star.textContent = '★';
      star.setAttribute('aria-label', `${i} of ${this.descriptor.max ?? 5}`);
      star.onclick = () => {
        this.setValue(i);
        this.requestUpdate();
      };

      this.buttons.push(star);
      container.appendChild(star);
    }

    return container;
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: unknown): void {
    this.value = Number(value) || 0;
    this.buttons.forEach((star, index) => {
      star.classList.toggle('filled', index < this.value);
    });
  }
}
```

`createControl` builds the element; the base class handles the wrapper, label,
tooltip, active state and tab membership.

::: warning Assign in `createControl`, not a field initializer
Under ES2022 class-field semantics, initializers run _after_ `super()`. The base
class calls `createControl` from a separate `build()` step for exactly this
reason — but it means anything you declare as `private x = …` is assigned after
the constructor chain, so initialise DOM references inside `createControl`
rather than relying on ordering.
:::

## Optional hooks

| Member                           | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `initialize()`                   | Async setup — load remote data. May return a promise |
| `onFormUpdate(ctx, triggerName)` | React to form changes                                |
| `setLoading(loading)`            | Show a loading state                                 |
| `focus()`                        | Move focus into the control                          |
| `destroy()`                      | Release listeners                                    |
| `get wrapperExtraClass()`        | Extra class for the field wrapper                    |
| `get contributesValue()`         | `false` for presentational kinds                     |
| `protected controlIdForLabel()`  | Which element the `<label for>` targets              |

Two protected helpers are available:

- **`this.requestUpdate(force?)`** — re-run the form update cycle.
- **`this.resolve(value)`** — unwrap a
  [`Reactive<T>`](/guide/fields/#reactive-t-literal-or-function) option.

The narrow `FormContext` your field is given exposes `ids`, `tooltips`,
`scheduler`, `parentData`, `stackData`, `isEditingArrayEntry`, `contextFor()`,
`persistFile()` and `createSubForm()`.

## Register the kind

Clone the default registry rather than mutating it, so other code is unaffected:

```ts
import { defaultFieldRegistry, DeclarativeForm } from 'declarative-forms';

const registry = defaultFieldRegistry.clone();
registry.register('rating', RatingField as never);
```

Registries are passed through the internal options argument, which nested forms
inherit:

```ts
const form = new DeclarativeForm(
  { fields: [{ name: 'score', kind: 'rating', max: 5 } as never] },
  { registry },
);
```

An unknown `kind` throws at construction with a message naming the field and
listing the known kinds — a typo fails loudly rather than rendering nothing.

## Typing your descriptor

To get full inference, widen the descriptor union in your own code:

```ts
import type { FieldDescriptor } from 'declarative-forms';

type AppField = FieldDescriptor | RatingFieldDescriptor;

const fields: AppField[] = [
  { name: 'title', displayName: 'Title' },
  { name: 'score', kind: 'rating', max: 5 },
];
```

## Respect the DOM contract

If your kind is meant to look at home, follow the existing conventions: the
wrapper already carries `.dl-form-field-wrapper` and
`#dl-form-field-wrapper-for-<name>`, so give your control a class of its own and
style it alongside the shipped [tokens](/guide/theming). See the
[DOM contract](/dom-contract).

## Async setup

```ts
export class RemoteField extends Field<MyDescriptor> {
  protected createControl(): HTMLElement {
    return document.createElement('div');
  }

  override async initialize(): Promise<void> {
    this.setLoading(true);
    const data = await fetch('/api/thing').then((r) => r.json());
    this.render(data);
    this.setLoading(false);
  }

  // …
}
```

`initialize()` is awaited by `form.whenReady()`, so callers can rely on your
field being populated before they read values.
