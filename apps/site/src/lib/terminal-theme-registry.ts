const themeFiles = import.meta.glob('../styles/terminal-themes/*.css', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const requiredTokens = [
  '--terminal-color-scheme', '--terminal-color-canvas', '--terminal-color-surface',
  '--terminal-color-surface-subtle', '--terminal-color-code-surface',
  '--terminal-color-text', '--terminal-color-muted', '--terminal-color-command',
  '--terminal-color-command-fill', '--terminal-color-on-command',
  '--terminal-color-link', '--terminal-color-warning', '--terminal-color-warning-fill',
  '--terminal-color-on-warning', '--terminal-color-marker', '--terminal-color-marker-border',
  '--terminal-color-error', '--terminal-color-error-border',
  '--terminal-color-border', '--terminal-color-focus', '--terminal-color-highlight',
  '--terminal-color-selection', '--terminal-color-shadow',
  '--terminal-color-ambient-slate', '--terminal-color-ambient-teal'
];

const themes = Object.entries(themeFiles).map(([file, css]) => {
  const name = file.split('/').at(-1)?.replace(/\.css$/u, '') ?? '';
  if (!/^firefly-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(name)) {
    throw new Error(`Invalid Terminal theme filename: ${file}`);
  }
  const declarations = css.replace(/\/\*[\s\S]*?\*\//gu, '');
  const selector = `.terminal-root[data-terminal-theme='firefly'][data-terminal-palette='${name}']`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'u').exec(declarations)?.[1];
  if (!block) throw new Error(`Terminal theme ${file} must define ${selector}`);
  for (const token of requiredTokens) {
    if (!new RegExp(`(?:^|;)\\s*${token}\\s*:`, 'u').test(block)) {
      throw new Error(`Terminal theme ${file} is missing ${token}`);
    }
  }
  const shikiRule = new RegExp(`\\.terminal-root\\[data-terminal-palette='${name}'\\]\\s+\\.astro-code\\s+span\\[style\\*='--shiki-(light|dark)'\\]\\s*\\{([^}]*)\\}`, 'u')
    .exec(declarations);
  if (!shikiRule || !new RegExp(`(?:^|;)\\s*color\\s*:[^;]*var\\(--shiki-${shikiRule[1]}\\)`, 'u').test(shikiRule[2])) {
    throw new Error(`Terminal theme ${file} must select its Shiki token palette in a color rule`);
  }
  const label = /(?:^|;)\s*--terminal-theme-label\s*:\s*"([^"\r\n]+)"\s*(?:;|$)/u.exec(block)?.[1] ?? name;
  return { name, css, label };
}).sort((left, right) => left.name.localeCompare(right.name));

if (!themes.some(({ name }) => name === 'firefly-dark')) {
  throw new Error('Terminal themes must include firefly-dark.css');
}

export const TERMINAL_THEME_NAMES = themes.map(({ name }) => name);
export const TERMINAL_THEME_OPTIONS = themes.map(({ name, label }) => ({ name, label }));
export const TERMINAL_THEME_CSS = themes.map(({ css }) => css).join('\n');
