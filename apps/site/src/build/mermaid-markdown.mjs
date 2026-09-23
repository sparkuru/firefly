import { renderDiagram } from './mermaid-renderer.mjs';

// Keep Mermaid source intact before the trusted diagram stage.
export const diagramPipelineVersion = 'firefly-static-mermaid-v4';

const text = (value) => ({ type: 'text', value });
const element = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const contents = (node) => node.type === 'text' ? node.value : (node.children ?? []).map(contents).join('');

export function rehypeMermaid({ resolveContext } = {}) {
  return async (tree, file) => {
    let index = 0;
    async function visit(parent) {
      for (let position = 0; position < (parent.children?.length ?? 0); position += 1) {
        const node = parent.children[position];
        const code = node.tagName === 'pre' && node.children?.find((child) => child.tagName === 'code');
        if (!code || !code.properties?.className?.includes('language-mermaid')) { await visit(node); continue; }
        index += 1;
        const source = contents(code);
        const result = await renderDiagram(source);
        const title = source.match(/^\s*accTitle\s*:\s*(.+)$/mu)?.[1]?.trim() || `Diagram ${index}`;
        const children = [element('figcaption', {}, [text(title)])];
        if (result.error) {
          const frontmatter = file.data.astro?.frontmatter ?? {};
          const route = resolveContext ? resolveContext(file).route : `document ${frontmatter.slug ?? '(unnamed)'}`;
          console.warn(`[MERMAID_SOURCE] ${route}: diagram ${index}: ${result.error}`);
          children.push(element('p', { className: ['document-diagram-message'] }, [text(result.error)]));
        } else {
          children.push(element('img', { src: result.url, alt: title, loading: 'lazy', decoding: 'async' }, []));
          children.push(element('a', { href: result.fullSizeUrl }, [text('Open full-size diagram')]));
        }
        children.push(element('details', result.error ? { open: true } : {}, [element('summary', {}, [text('Mermaid source')]), node]));
        parent.children[position] = element('figure', { className: ['document-diagram'], dataDiagram: result.error ? 'fallback' : 'rendered' }, children);
      }
    }
    await visit(tree);
  };
}
