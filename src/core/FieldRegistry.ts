import { ArrayField } from '../fields/ArrayField.js';
import { CardsField } from '../fields/CardsField.js';
import { CheckboxField } from '../fields/CheckboxField.js';
import { ComputedField } from '../fields/ComputedField.js';
import { CustomField } from '../fields/CustomField.js';
import { FileField } from '../fields/FileField.js';
import { MessageField } from '../fields/MessageField.js';
import { SelectField } from '../fields/SelectField.js';
import { TextAreaField } from '../fields/TextAreaField.js';
import { TextField } from '../fields/TextField.js';
import type { Field } from '../fields/Field.js';
import type { FieldDescriptor } from '../types/descriptors.js';
import type { FormContext } from './FormContext.js';

/** Constructs a field from its descriptor. */
export type FieldConstructor = new (
  descriptor: never,
  context: FormContext,
) => Field<never>;

/**
 * Maps a descriptor's `kind` to the class that implements it.
 *
 * This replaces v1's ten-branch `if/else`, and makes the set of field kinds
 * extensible: register your own class and it becomes usable in any descriptor.
 */
export class FieldRegistry {
  private readonly kinds = new Map<string, FieldConstructor>();

  constructor(entries?: Iterable<[string, FieldConstructor]>) {
    for (const [kind, ctor] of entries ?? []) this.kinds.set(kind, ctor);
  }

  register(kind: string, ctor: FieldConstructor): this {
    this.kinds.set(kind, ctor);
    return this;
  }

  has(kind: string): boolean {
    return this.kinds.has(kind);
  }

  /** A copy, so callers can add kinds without mutating the shared default. */
  clone(): FieldRegistry {
    return new FieldRegistry(this.kinds);
  }

  create(descriptor: FieldDescriptor, context: FormContext): Field {
    const kind = descriptor.kind ?? 'text';
    const Ctor = this.kinds.get(kind);

    if (!Ctor) {
      throw new Error(
        `declarativ-forms: unknown field kind "${kind}" on field "${descriptor.name}". ` +
          `Known kinds: ${[...this.kinds.keys()].sort().join(', ')}.`,
      );
    }

    return (new Ctor(descriptor as never, context) as Field).build();
  }
}

/** The built-in field kinds. */
export const defaultFieldRegistry = new FieldRegistry([
  ['text', TextField as unknown as FieldConstructor],
  ['textarea', TextAreaField as unknown as FieldConstructor],
  ['select', SelectField as unknown as FieldConstructor],
  ['checkbox', CheckboxField as unknown as FieldConstructor],
  ['message', MessageField as unknown as FieldConstructor],
  ['file', FileField as unknown as FieldConstructor],
  ['computed', ComputedField as unknown as FieldConstructor],
  ['cards', CardsField as unknown as FieldConstructor],
  ['custom', CustomField as unknown as FieldConstructor],
  ['array', ArrayField as unknown as FieldConstructor],
]);
