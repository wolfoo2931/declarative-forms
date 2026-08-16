/**
 * Structural styles for `<dl-select>`.
 *
 * These live in JS rather than in the shipped stylesheet because the component
 * does not work without them — the options popup is absolutely positioned and
 * toggled through these rules. Everything here is themable through the `--dl-*`
 * custom properties, and the form/modal chrome ships separately as
 * `declarativ-forms/styles.css`.
 *
 * v1 appended this on `window.load` as an import side effect, which broke SSR
 * and leaked between tests. It is now injected lazily, the first time a
 * `<dl-select>` is actually connected to a document.
 */
export const DL_SELECT_STYLES = `
@keyframes dl-placeholder-shimmer {
    0% { background-position: -468px 0 }
    100% { background-position: 468px 0 }
}

dl-select {
    display: block;
    position: relative;
    font-weight: 300;
    font-family: var(--dl-font-family, 'Rubik');
    --dl-select-input-width: 370px;
}

dl-select .input-wrapper {
    display: inline-block;
    border-width: 2px;
    border-style: solid;
    border-color: var(--dl-line-color, #ddd);
    background-color: var(--dl-options-background, #fff);
    color: var(--dl-options-text-color, #545454);
    border-radius: 4px;
}

dl-select.dl-focused .input-wrapper {
    border-color: var(--dl-focused-line-color, #bbb);
}

dl-select.dl-focused .input-wrapper svg {
    border-left: 1px solid var(--dl-focused-line-color, #bbb);
    fill: var(--dl-focused-line-color, #bbb);
}

dl-select .input-wrapper input {
    width: var(--dl-select-input-width);
    color: var(--dl-options-text-color, #545454);
    outline-width: 0;
    margin-top: 2px;
    padding: 6px;
    font-size: var(--dl-font-size, 0.9em);
    font-family: var(--dl-font-family, 'Rubik');
    font-weight: 300;
    border: 0;
    border-radius: 4px;
    float: left;
    cursor: pointer;
    box-sizing: content-box;
    background: transparent;
}

dl-select .input-wrapper input::placeholder {
    color: var(--dl-options-inactive-text-color, #545454);
}

dl-select .input-wrapper svg {
    width: 20px;
    height: 20px;
    margin-top: var(--dl-drop-down-icon-margin-top, 5px);
    margin-right: 4px;
    padding-left: 4px;
    fill: var(--dl-line-color, #ddd);
    float: right;
    border-left: 1px solid var(--dl-line-color, #ddd);
    cursor: pointer;
}

.options-wrapper {
    position: absolute;
    left: 0;
    top: 20px;
    font-size: var(--dl-font-size, 0.9em);
    width: 100%;
    max-height: 230px;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 0 0 10px -2px rgba(0, 0, 0, 0.4);
    z-index: 100;
    background-color: var(--dl-options-background, #fff);
    font-family: var(--dl-font-family, 'Rubik');
    border-top: 1px solid var(--dl-focused-line-color, #bbb);
    border-bottom: 1px solid var(--dl-focused-line-color, #bbb);
    border-radius: 4px;
}

.options-wrapper dl-option {
    display: block;
    border-left: 1px solid var(--dl-focused-line-color, #bbb);
    border-right: 1px solid var(--dl-focused-line-color, #bbb);
    cursor: pointer;
    padding-top: var(--dl-options-padding-top, 5px);
    padding-right: var(--dl-options-padding-right, 5px);
    padding-bottom: var(--dl-options-padding-bottom, 5px);
    padding-left: var(--dl-options-padding-left, 5px);
    color: var(--dl-options-text-color, #545454);
    background-color: var(--dl-options-background, #fff);
}

.options-wrapper dl-option[selected="true"] {
    opacity: 0.5;
    cursor: not-allowed;
}

.options-wrapper dl-option:hover,
.options-wrapper dl-option.dl-focused {
    background-color: var(--dl-options-option-hover-color, rgba(224, 240, 227, 0.4));
}

.options-wrapper .noMatchesHint {
    border-left: 1px solid var(--dl-focused-line-color, #bbb);
    border-right: 1px solid var(--dl-focused-line-color, #bbb);
    padding: 5px;
    font-style: italic;
    color: var(--dl-options-text-color, #545454);
}

dl-select .dl-option-tag {
    float: right;
    border: 1px solid #888;
    font-size: 0.8em;
    padding: 2px;
    font-family: 'Source Code Pro', monospace;
    border-radius: 2px;
    margin-top: -1px;
}

dl-select .dl-option-tag:last-child {
    margin-right: 10px;
}

.dl-select-no-options-available svg path { display: none; }
.dl-select-no-options-available svg { border-left: none !important; }

.dl-select-loading svg,
.dl-select-no-options-available svg,
.dl-select-loading input,
.dl-select-no-options-available input {
    pointer-events: none;
}

.dl-select-loading .input-wrapper {
    animation: dl-placeholder-shimmer 1.25s linear infinite forwards;
    background: linear-gradient(
        to right,
        var(--dl-select-loading-col1, #eee) 10%,
        var(--dl-select-loading-col2, #ddd) 18%,
        var(--dl-select-loading-col1, #eee) 33%
    );
    background-size: 800px 104px;
    position: relative;
    width: 412px;
}

.dl-select-loading input { opacity: 0; }

.dl-field-one-third input,
.dl-field-two-third input {
    --dl-select-input-width: 127px;
}

body.dark-theme dl-select {
    --dl-select-loading-col1: #282727;
    --dl-select-loading-col2: #505656;
}
`;

let injected = false;

/**
 * Inject the `<dl-select>` styles once per document.
 *
 * Safe to call repeatedly and safe to call before `document.body` exists.
 */
export function injectStyles(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;

  const style = document.createElement('style');
  style.setAttribute('data-declarativ-forms', 'dl-select');
  style.textContent = DL_SELECT_STYLES;
  (document.head ?? document.documentElement).appendChild(style);
}

/** Allow re-injection. Test-only. */
export function resetStyleInjection(): void {
  injected = false;
}
