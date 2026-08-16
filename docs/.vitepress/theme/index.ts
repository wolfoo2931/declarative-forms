import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';

// The library's own stylesheet, so the demos look like the real thing.
import '../../../styles/declarative-forms.css';
import './demo.css';

import LiveForm from './LiveForm.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveForm', LiveForm);
  },
} satisfies Theme;
