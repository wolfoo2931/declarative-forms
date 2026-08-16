<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { DeclarativeForm, html } from '../../../src/index.js';
import type { DeclarativeFormOptions, FormValues } from '../../../src/index.js';

const props = withDefaults(
  defineProps<{
    /** `inline` embeds the form in the page; `modal` opens it in a dialog. */
    mode?: 'inline' | 'modal';
    /** Label for the button that opens a modal demo. */
    open?: string;
    /** Hide the live values panel for demos where it adds nothing. */
    values?: boolean;
  }>(),
  { mode: 'inline', open: 'Open dialog', values: true },
);

const codeHost = ref<HTMLElement>();
const formHost = ref<HTMLElement>();

const liveValues = ref('');
const submitted = ref('');
const error = ref('');

let build: (() => DeclarativeFormOptions) | null = null;
let current: DeclarativeForm | null = null;

const show = (v: FormValues) => JSON.stringify(v, null, 2);

/**
 * Read the demo source out of the rendered code block.
 *
 * The slot holds a normal fenced block, so it keeps the site's syntax
 * highlighting — and evaluating that exact text is what guarantees the snippet
 * shown on the page is the snippet that runs.
 */
function compile(): void {
  const source = codeHost.value?.querySelector('code')?.textContent?.trim();
  if (!source) throw new Error('LiveForm: no code block found in the slot.');

  const factory = new Function('html', `"use strict"; return (${source});`) as (
    h: typeof html,
  ) => DeclarativeFormOptions;

  build = () => factory(html);
}

/** Wrap the demo's own callbacks so the values panel reflects what happened. */
function instrument(options: DeclarativeFormOptions): DeclarativeFormOptions {
  const userConfirm = options.onConfirm;

  return {
    ...options,
    // A modal demo stays dismissable even if the snippet omits `onCancel`;
    // an embedded one has nothing to dismiss, so it must not grow a ✕.
    onCancel:
      props.mode === 'modal' ? (options.onCancel ?? (() => undefined)) : undefined,
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
  current?.destroy();
  current = create();
  current.openInModal();
}

onMounted(() => {
  try {
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
});
</script>

<template>
  <div class="live-form">
    <div ref="codeHost" class="live-form__code">
      <slot />
    </div>

    <div class="live-form__stage">
      <p class="live-form__label">Live</p>

      <p v-if="error" class="live-form__error">{{ error }}</p>

      <button v-if="mode === 'modal'" class="live-form__open" @click="openModal">
        {{ open }}
      </button>

      <div v-show="mode === 'inline'" ref="formHost" class="live-form__host" />

      <template v-if="values">
        <p class="live-form__label">Values</p>
        <pre class="live-form__values">{{ liveValues || '—' }}</pre>
      </template>

      <template v-if="submitted">
        <p class="live-form__label">Submitted</p>
        <pre class="live-form__values live-form__values--ok">{{ submitted }}</pre>
      </template>
    </div>
  </div>
</template>
