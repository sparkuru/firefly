import { rehypeShiki } from '@astrojs/markdown-remark';

// Authored HTML is sanitized before trusted Shiki styles enter the tree.
export const siteSyntaxHighlight = false;
const siteShikiOptions = {
  themes: { light: 'github-light', dark: 'github-dark' },
  defaultColor: false
};
const siteShikiExcludedLanguages = ['mermaid'];
export const siteRehypeShiki = () => rehypeShiki(siteShikiOptions, siteShikiExcludedLanguages);
