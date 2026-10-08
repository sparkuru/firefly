// Legacy Memo bodies remain immutable. Repair the generated reading hierarchy
// before either X Core or Astro collects heading identities.
export function normalizeMemoBodyTree(tree) {
  let previous = 1;
  let headings = 0;
  let footnotes = 0;
  const walk = (node) => {
    if (node.type === 'element') {
      if (['pre', 'code'].includes(node.tagName)) return;
      // remark-rehype creates this hidden label, not an authored section heading.
      // Keep its ID so every aria-describedby reference stays valid.
      if (node.tagName === 'h2' && !node.position && node.properties?.id === 'footnote-label' && node.properties.className?.includes('sr-only')) {
        node.tagName = 'p';
        footnotes += 1;
      } else if (/^h[1-6]$/u.test(node.tagName)) {
        const old = Number(node.tagName.slice(1));
        const depth = Math.max(2, Math.min(old, previous + 1));
        if (old !== depth) { node.tagName = 'h' + depth; headings += 1; }
        previous = depth;
      }
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
  return { headings, footnotes };
}

export function rehypeMemoBodyCompatibility({ resolveContext }) {
  return (tree, file) => {
    const context = resolveContext(file);
    if (context.collection !== 'memos') return;
    const result = normalizeMemoBodyTree(tree);
    file.data.astro.frontmatter.memoCompatibility = result;
    if (result.headings || result.footnotes) {
      console.warn('[MEMO_BODY_COMPATIBILITY] ' + context.documentId + ' headings=' + result.headings + ' footnoteLabels=' + result.footnotes);
    }
  };
}
