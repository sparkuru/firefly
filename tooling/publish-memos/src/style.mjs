// Retain Firefly's public reading palette and system fonts without importing blog assets.
export const STYLESHEET = `
:root { color-scheme: light; --background: #f7f7f5; --foreground: #171717; --muted: #555550; --border: #d6d6d0; --accent: #174a7e; --focus: #9b5b00; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 100%; line-height: 1.7; background: var(--background); color: var(--foreground); }
* { box-sizing: border-box; }
body { margin: 0; }
main { max-width: 48rem; margin: auto; padding: 2.5rem 1.5rem; }
a { color: var(--accent); text-underline-offset: .2em; }
a:focus-visible, summary:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }
nav { display: flex; flex-wrap: wrap; gap: 1rem; }
h1 { font-size: 2rem; line-height: 1.25; }
h2, h3, h4, h5, h6 { line-height: 1.4; }
article { border-top: 1px solid var(--border); padding: 1.5rem 0; min-width: 0; overflow-wrap: anywhere; }
article header { display: flex; flex-wrap: wrap; gap: .25rem 1rem; color: var(--muted); font-size: .875rem; }
article header strong { color: var(--foreground); }
.memo-body { min-width: 0; }
.memo-body > :first-child { margin-top: 1rem; }
img { max-width: 100%; height: auto; }
pre { max-width: 100%; overflow: auto; padding: 1rem; background: #ecece8; border-radius: .25rem; }
code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .9em; }
table { display: block; max-width: 100%; overflow: auto; border-collapse: collapse; }
td, th { border: 1px solid var(--border); padding: .5rem .75rem; }
blockquote { border-left: 3px solid var(--border); padding-left: 1rem; margin-left: 0; }
ul, ol { padding-left: 1.5rem; }
.firefly-content-center { text-align: center; }
.firefly-content-callout { border: 1px solid var(--border); padding: 1rem; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (max-width: 30rem) { main { padding: 1.5rem 1rem; } h1 { font-size: 1.75rem; } }
`;
