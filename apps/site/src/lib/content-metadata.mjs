const frontmatterOpening = /^(?:\uFEFF)?---[ \t]*(?:\r\n|\n|\r|$)/u;
const frontmatterClosing = /^---[ \t]*(?:\r\n|\n|\r|$)/gmu;

function frontmatterInfo(markdown) {
  const opening = frontmatterOpening.exec(markdown);
  if (opening === null) return { kind: 'none' };

  frontmatterClosing.lastIndex = opening[0].length;
  const closing = frontmatterClosing.exec(markdown);
  frontmatterClosing.lastIndex = 0;
  if (closing === null) return { kind: 'malformed' };

  const content = markdown.slice(opening[0].length, closing.index);
  const empty = content.split(/\r\n|\n|\r/u).every((line) => {
    const trimmed = line.trim();
    return trimmed.length === 0 || trimmed.startsWith('#');
  });
  return {
    kind: empty ? 'empty' : 'present',
    end: closing.index + closing[0].length
  };
}

export function filenameStem(filename) {
  return filename.endsWith('.md') ? filename.slice(0, -3) : filename;
}

export function displayNameForDocument({ title, filename }) {
  if (typeof title === 'string' && title.trim().length > 0) return title.trim();
  return filenameStem(filename);
}

export function safeSlugFromFilename(filename) {
  const stem = filenameStem(filename).trim().replace(/\s+/gu, '-');
  return stem.length === 0 ? 'document' : stem;
}

export function utcCalendarDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new TypeError('Cannot derive a calendar date from an invalid time.');
  return date.toISOString().slice(0, 10);
}

function quoteYamlString(value) {
  return JSON.stringify(value);
}

export function createRuntimeFrontmatter({ filename, collection, mtimeMs }) {
  const stem = filenameStem(filename);
  const lines = [
    '---',
    `title: ${quoteYamlString(stem)}`,
    `description: ${quoteYamlString(stem)}`,
    `date: ${quoteYamlString(utcCalendarDate(mtimeMs))}`,
    'draft: false',
    `layout: ${quoteYamlString(collection === 'pages' ? 'page' : 'post')}`
  ];
  if (collection === 'pages') lines.push(`slug: ${quoteYamlString(safeSlugFromFilename(filename))}`);
  lines.push('---', '', '');
  return lines.join('\n');
}

export function addRuntimeFrontmatter(markdown, options) {
  const info = frontmatterInfo(markdown);
  if (info.kind !== 'none' && info.kind !== 'empty') return markdown;
  const frontmatter = createRuntimeFrontmatter(options);
  return info.kind === 'none'
    ? `${frontmatter}${markdown}`
    : `${frontmatter}${markdown.slice(info.end)}`;
}

export function classifyFrontmatter(markdown) {
  return frontmatterInfo(markdown).kind;
}
