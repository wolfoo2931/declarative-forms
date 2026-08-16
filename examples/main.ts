// In your own app this is `import 'declarativ-forms/styles.css'`.
import '../styles/declarative-forms.css';
import { DeclarativeForm, html } from '../src/index.js';
import type { FormValues } from '../src/index.js';

const output = document.getElementById('output') as HTMLElement;

function show(values: FormValues): void {
  output.textContent = JSON.stringify(values, null, 2);
}

const on = (id: string, handler: () => void): void => {
  document.getElementById(id)?.addEventListener('click', handler);
};

// --------------------------------------------------------------- basic

on('demo-basic', () => {
  new DeclarativeForm({
    fields: [
      { name: 'title', displayName: 'Title', placeholder: 'My document' },
      {
        name: 'summary',
        kind: 'textarea',
        displayName: 'Summary',
        allowNewlines: true,
        tooltip: 'Shown in search results.',
      },
      {
        name: 'language',
        kind: 'select',
        displayName: 'Language',
        options: [
          { value: 'en', label: 'English' },
          { value: 'de', label: 'German' },
          { value: 'fr', label: 'French' },
        ],
        defaultValue: 'en',
      },
      {
        name: 'tags',
        kind: 'select',
        displayName: 'Tags',
        multiple: true,
        options: ['docs', 'draft', 'internal'],
      },
      {
        name: 'agree',
        kind: 'checkbox',
        label: html('I accept the <a href="#" onclick="return false">terms</a>'),
      },
      {
        name: 'note',
        kind: 'message',
        message: 'Nothing here is saved anywhere — this is a demo.',
      },
    ],
    onConfirm: show,
    onCancel: () => {},
  }).openInModal();
});

// ----------------------------------------------------------- reactivity

on('demo-reactive', () => {
  new DeclarativeForm({
    fields: [
      {
        name: 'source',
        kind: 'select',
        displayName: 'Source',
        options: ['GitHub', 'GitLab'],
        defaultValue: 'GitHub',
      },
      {
        name: 'owner',
        displayName: 'Owner',
        defaultValue: 'wolfoo2931',
        tooltip: 'Changing this reloads the repository list.',
      },
      {
        name: 'repo',
        kind: 'select',
        displayName: 'Repository',
        reloadOnChangeOf: ['owner', 'source'],
        // Async options, recomputed whenever a declared dependency changes.
        options: async ({ data }) => {
          await new Promise((r) => setTimeout(r, 400));
          const owner = String(data['owner'] || 'nobody');
          return [`${owner}/declarativ-forms`, `${owner}/notes`].map((value) => ({
            value,
            label: value,
          }));
        },
      },
      {
        name: 'token',
        displayName: 'Access token',
        type: 'password',
        // Only relevant for private sources.
        isActive: ({ data }) => data['source'] === 'GitLab',
      },
      {
        name: 'slug',
        kind: 'computed',
        compute: ({ data }) => String(data['repo'] ?? '').split('/').pop() ?? '',
      },
      {
        name: 'preview',
        kind: 'custom',
        displayName: 'Preview',
        render: (ctx) => {
          ctx.element.textContent = `${String(ctx.data['source'])} → ${String(
            ctx.data['repo'] || '(loading)',
          )}`;
        },
      },
    ],
    onConfirm: show,
    onCancel: () => {},
  }).openInModal();
});

// ----------------------------------------------------------------- tabs

on('demo-tabs', () => {
  const form = new DeclarativeForm({
    fields: [
      { name: 'name', displayName: 'Name', tab: 'General', defaultValue: 'Report' },
      { name: 'author', displayName: 'Author', tab: 'General' },
      {
        name: 'format',
        kind: 'cards',
        tab: 'Export',
        cards: [
          { value: 'pdf', content: html('<b>PDF</b><br>Print ready') },
          { value: 'html', content: html('<b>HTML</b><br>For the web') },
        ],
      },
      {
        name: 'email',
        displayName: 'Notify (email)',
        tab: 'Delivery',
        tooltip: { text: 'Must contain an @.', inInput: true },
      },
    ],
    buttons: {
      Back: {
        id: 'backBtn',
        class: 'secondary',
        doNotCloseModal: true,
        action: () => step(-1),
      },
      Next: { id: 'nextBtn', doNotCloseModal: true, action: () => step(1) },
      Export: {
        id: 'exportBtn',
        // Async predicates are supported; the button stays disabled until it resolves.
        isActive: async ({ data }) => String(data['email'] ?? '').includes('@'),
        action: show,
      },
    },
    onCancel: () => {},
  });

  const modal = form.openInModal({ classNames: ['largeModal'] });

  function step(delta: number): void {
    const tabs = [...modal.querySelectorAll('.dl-tab-btn')];
    const index = tabs.findIndex((t) => t.classList.contains('active'));
    (tabs[index + delta] as HTMLElement | undefined)?.click();
  }
});

// ---------------------------------------------------------------- arrays

on('demo-array', () => {
  new DeclarativeForm({
    fields: [
      { name: 'docTitle', displayName: 'Document', defaultValue: 'Thesis' },
      {
        name: 'authors',
        kind: 'array',
        displayName: 'Authors',
        newButtonLabel: 'Add Author',
        of: [
          { name: 'preName', displayName: 'First name' },
          { name: 'lastName', displayName: 'Last name' },
          {
            name: 'role',
            kind: 'select',
            displayName: 'Role',
            options: ['Author', 'Editor', 'Reviewer'],
            defaultValue: 'Author',
          },
        ],
        renderEntry: (entry) =>
          `${String(entry['preName'])} ${String(entry['lastName'])} (${String(entry['role'])})`,
        isValidRecord: (entry) => String(entry['lastName'] ?? '').trim().length > 0,
        suggested: [
          { preName: 'Ada', lastName: 'Lovelace', role: 'Author' },
          { preName: 'Grace', lastName: 'Hopper', role: 'Reviewer' },
        ],
      },
    ],
    onConfirm: show,
    onCancel: () => {},
  }).openInModal();
});

// -------------------------------------------------------------- embedded

on('demo-embedded', () => {
  const host = document.getElementById('embedded') as HTMLElement;
  host.replaceChildren();

  const form = new DeclarativeForm({
    fields: [
      { name: 'query', displayName: 'Search', placeholder: 'Type to see live values' },
      {
        name: 'echo',
        kind: 'message',
        message: ({ data }) => `You typed: ${String(data['query'] || '…')}`,
      },
    ],
    buttons: { Apply: { action: show } },
  });

  form.appendInElement(host);
  form.subscribeOnInput((values) => show(values));
});
