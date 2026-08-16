<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { DeclarativeForm, html } from '../../../src/index.js';
import type { DeclarativeFormOptions, FormValues } from '../../../src/index.js';

const props = withDefaults(
  defineProps<{
    /**
     * - `inline` embeds the form in the page
     * - `modal` opens the descriptor in a dialog
     * - `program` runs the whole snippet, `openInModal()` call and all
     */
    mode?: 'inline' | 'modal' | 'program';
    /** Label for the button that opens a modal demo. */
    open?: string;
    /** Hide the live values panel for demos where it adds nothing. */
    values?: boolean;
    /**
     * Where the running form sits relative to its source. `top` puts the result
     * first, for demos that are meant to be played with before they are read.
     */
    stage?: 'top' | 'bottom';
  }>(),
  { mode: 'inline', open: 'Open dialog', values: true, stage: 'bottom' },
);

const codeHost = ref<HTMLElement>();
const formHost = ref<HTMLElement>();

const liveValues = ref('');
const submitted = ref('');
const error = ref('');

let build: (() => DeclarativeFormOptions) | null = null;
let run: (() => void) | null = null;
let current: DeclarativeForm | null = null;

/** Forms a `program` snippet built, so a re-run can clean up after the last one. */
const spawned: DeclarativeForm[] = [];

const show = (v: FormValues) => JSON.stringify(v, null, 2);

/** The demo source, exactly as the page renders it. */
function source(): string {
  const text = codeHost.value?.querySelector('code')?.textContent?.trim();
  if (!text) throw new Error('LiveForm: no code block found in the slot.');
  return text;
}

/**
 * Compile a descriptor snippet: one object literal.
 *
 * The slot holds a normal fenced block, so it keeps the site's syntax
 * highlighting — and evaluating that exact text is what guarantees the snippet
 * shown on the page is the snippet that runs.
 */
function compile(): void {
  const factory = new Function('html', `"use strict"; return (${source()});`) as (
    h: typeof html,
  ) => DeclarativeFormOptions;

  build = () => factory(html);
}

/**
 * Compile a program snippet: statements that construct forms and open them.
 *
 * `import` lines are stripped and the two bindings they bring in are injected
 * instead, so the snippet can be written the way it would be in an application
 * — including the `openInModal()` call — and still run in the page.
 *
 * The `DeclarativeForm` the snippet receives is a subclass that reports the
 * first form built on each run to the panels below the demo. Dialogs the
 * snippet opens on top of that one are left alone, so the panels keep tracking
 * the root dialog while you work through the stack.
 */
function compileProgram(): void {
  const body = source().replace(/^\s*import .*$/gm, '');
  const program = new Function('DeclarativeForm', 'html', `"use strict";\n${body}`) as (
    form: typeof DeclarativeForm,
    h: typeof html,
  ) => void;

  run = () => {
    let isRoot = true;

    class DemoForm extends DeclarativeForm {
      constructor(options: DeclarativeFormOptions) {
        const root = isRoot;
        isRoot = false;

        super(root ? instrument(options) : options);
        spawned.push(this);

        if (root) {
          this.subscribeOnInput((values) => {
            liveValues.value = show(values);
          });
        }
      }
    }

    program(DemoForm, html);
  };
}

/**
 * How the demo dialog is dismissed.
 *
 * A `modal` demo stays dismissable even if its descriptor omits `onCancel`; an
 * embedded one has nothing to dismiss, so it must not grow a ✕; a `program`
 * snippet is a complete application snippet, so it decides for itself.
 */
function dismissal(options: DeclarativeFormOptions): (() => void) | undefined {
  if (props.mode === 'inline') return undefined;
  if (props.mode === 'program') return options.onCancel;
  return options.onCancel ?? (() => undefined);
}

/**
 * Wrap the demo's own callbacks so the values panel reflects what happened.
 *
 * A snippet that declares its own `buttons` never runs `onConfirm`, so the
 * first button — the primary, the one Enter activates — is wrapped as well.
 */
function instrument(options: DeclarativeFormOptions): DeclarativeFormOptions {
  const userConfirm = options.onConfirm;
  const [primary, ...others] = Object.entries(options.buttons ?? {});

  return {
    ...options,
    buttons: primary
      ? Object.fromEntries([
          [
            primary[0],
            {
              ...primary[1],
              action: (values: FormValues) => {
                submitted.value = show(values);
                return primary[1].action?.(values);
              },
            },
          ],
          ...others,
        ])
      : options.buttons,
    onCancel: dismissal(options),
    onConfirm: (values) => {
      submitted.value = show(values);
      return userConfirm?.(values);
    },
  };
}

function create(): DeclarativeForm {
  const form = new DeclarativeForm(instrument(build!()));
  form.subscribeOnInput((values) => {
    liveValues.value = show(values);
  });
  return form;
}

function openModal(): void {
  submitted.value = '';
  error.value = '';

  try {
    openDialog();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

function openDialog(): void {
  if (props.mode === 'program') {
    // Whatever the last run left open goes away before the snippet runs again.
    for (const form of spawned.splice(0)) form.destroy();
    liveValues.value = '';
    run!();
    return;
  }

  current?.destroy();
  current = create();
  current.openInModal();
}

onMounted(() => {
  try {
    if (props.mode === 'program') {
      compileProgram();
      return;
    }

    compile();

    if (props.mode === 'inline') {
      current = create();
      current.appendInElement(formHost.value!);
      void current.whenReady().then(() => {
        liveValues.value = show(current!.getValues());
      });
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
});

onBeforeUnmount(() => {
  current?.destroy();
  current = null;

  for (const form of spawned.splice(0)) form.destroy();
});
</script>

<template>
  <div class="live-form" :class="{ 'live-form--stage-top': stage === 'top' }">
    <!--
      The source moves rather than the stage, and it moves in the DOM rather
      than with `order`, so reading order and tab order stay in step — the code
      block carries a focusable copy button.
    -->
    <div v-if="stage === 'bottom'" ref="codeHost" class="live-form__code">
      <slot />
    </div>

    <div class="live-form__stage">
      <p v-if="error" class="live-form__error">{{ error }}</p>

      <!--
        The canvas is deliberately a different surface from both the docs page
        and the code block above it, so the boundary of the rendered form is
        never in doubt: everything inside the frame is the library's output.
      -->
      <div
        class="live-form__canvas"
        :class="{ 'live-form__canvas--trigger': mode !== 'inline' }"
      >
        <span class="live-form__canvas-label">
          {{ mode === 'inline' ? 'Rendered form' : 'Opens a dialog' }}
        </span>

        <button v-if="mode !== 'inline'" class="live-form__open" @click="openModal">
          {{ open }}
        </button>

        <div v-show="mode === 'inline'" ref="formHost" class="live-form__host" />
      </div>

      <template v-if="values">
        <p class="live-form__label">Values</p>
        <pre class="live-form__values">{{ liveValues || '—' }}</pre>
      </template>

      <template v-if="submitted">
        <p class="live-form__label">Submitted on confirm</p>
        <pre class="live-form__values live-form__values--ok">{{ submitted }}</pre>
      </template>
    </div>

    <div v-if="stage === 'top'" ref="codeHost" class="live-form__code">
      <slot />
    </div>
  </div>
</template>
