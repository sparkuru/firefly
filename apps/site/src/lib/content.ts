import { getCollection, type CollectionEntry } from 'astro:content';
import {
  GUEST_PRINCIPAL as guestPrincipal,
  projectContentForPrincipal
} from './content-access.mjs';
import { resolveContentMarkers } from './content-markers.mjs';

export type PublicPost = CollectionEntry<'posts'>;
export type PublicPage = CollectionEntry<'pages'>;
export type PublicDocumentEntry = PublicPost | PublicPage;
export type ContentMarker = ReturnType<typeof resolveContentMarkers>[number];

export type ContentPrincipal =
  | { readonly kind: 'guest' }
  | { readonly kind: 'user'; readonly subject: string }
  | { readonly kind: 'admin' };

export interface CanonicalBreadcrumb {
  readonly label: string;
  readonly href: string;
}

export interface CanonicalDocument {
  readonly entry: PublicDocumentEntry;
  readonly collection: 'posts' | 'pages';
  readonly relativePath: string;
  readonly virtualPath: string;
  readonly filename: `${string}.md`;
  readonly href: string;
  readonly directoryHrefs: readonly string[];
  readonly breadcrumbs: readonly CanonicalBreadcrumb[];
  readonly aliases: readonly string[];
  readonly markers: readonly ContentMarker[];
}

export interface ContentFile {
  readonly kind: 'file';
  readonly name: string;
  readonly virtualPath: string;
  readonly href: string;
  readonly document: CanonicalDocument;
}

export interface ContentDirectory {
  readonly kind: 'directory';
  readonly name: string;
  readonly virtualPath: string;
  readonly href: string;
  readonly children: readonly (ContentDirectory | ContentFile)[];
}

export interface CanonicalContent {
  readonly documents: readonly CanonicalDocument[];
  readonly posts: readonly CanonicalDocument[];
  readonly pages: readonly CanonicalDocument[];
  readonly tree: ContentDirectory;
  readonly directories: readonly ContentDirectory[];
}

export const GUEST_PRINCIPAL: ContentPrincipal = guestPrincipal;

const markdownPath = /^[^\\/?#%\u0000-\u001f\u007f]+(?:\/[^\\/?#%\u0000-\u001f\u007f]+)*\.md$/u;

function collisionKey(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replaceAll('\u00df', 'ss')
    .replaceAll('\u03c2', '\u03c3');
}

function normalizeMarkdownPath(id: string) {
  const relativePath = id.endsWith('.md') ? id : `${id}.md`;
  if (id.normalize('NFC') !== id || !markdownPath.test(relativePath) || relativePath.split('/').some((segment) => segment.startsWith('.') || segment === '..')) {
    throw new Error(`Invalid staged Markdown path: ${id}`);
  }
  return relativePath;
}

function routeFromRelativePath(collection: 'posts' | 'pages', relativePath: string, slug: string) {
  if (collection === 'pages') return `/pages/${slug}/`;
  const segments = relativePath.split('/');
  const parentSegments = segments.slice(0, -1);
  return `/posts/${[...parentSegments, slug].join('/')}/`;
}

function directoryHref(segments: readonly string[]) {
  return `/${segments.join('/')}/`;
}

export function createCanonicalDocument(entry: PublicDocumentEntry): CanonicalDocument {
  const collection = entry.collection;
  const relativePath = normalizeMarkdownPath(entry.id);
  const pathSegments = relativePath.split('/');
  const filename = pathSegments.at(-1);
  if (filename === undefined || !filename.endsWith('.md')) {
    throw new Error(`Invalid Markdown identity for ${collection}/${entry.id}.`);
  }
  const stem = filename.slice(0, -3);
  const routeSlug = (entry.data.slug ?? stem).replace(/\s+/gu, '-');
  const virtualPath = `${collection}/${relativePath}`;
  const markers = resolveContentMarkers(entry.data.firefly?.markers);
  const parentSegments = [collection, ...pathSegments.slice(0, -1)];
  const directoryHrefs = parentSegments.map((_, index) => directoryHref(parentSegments.slice(0, index + 1)));
  const breadcrumbs = Object.freeze([
    Object.freeze({ label: '/', href: '/' }),
    ...parentSegments.map((label, index) => Object.freeze({
      label,
      href: directoryHref(parentSegments.slice(0, index + 1))
    }))
  ]);
  return Object.freeze({
    entry,
    collection,
    relativePath,
    virtualPath,
    filename: filename as `${string}.md`,
    href: routeFromRelativePath(collection, relativePath, routeSlug),
    directoryHrefs: Object.freeze(directoryHrefs),
    breadcrumbs,
    aliases: Object.freeze([...(entry.data.aliases ?? [])]),
    markers
  });
}

export function projectContent(
  documents: readonly CanonicalDocument[],
  principal: ContentPrincipal
): readonly CanonicalDocument[] {
  return projectContentForPrincipal(documents, principal) as readonly CanonicalDocument[];
}

function compareCodePoint(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function freezeDirectory(directory: MutableDirectory): ContentDirectory {
  const directories = [...directory.directories.values()]
    .sort((left, right) => compareCodePoint(left.name, right.name))
    .map(freezeDirectory);
  const files = [...directory.files]
    .sort((left, right) => compareCodePoint(left.name, right.name))
    .map((file) => Object.freeze(file));
  return Object.freeze({
    kind: 'directory',
    name: directory.name,
    virtualPath: directory.virtualPath,
    href: directory.href,
    children: Object.freeze([...directories, ...files])
  });
}

interface MutableDirectory {
  name: string;
  virtualPath: string;
  href: string;
  directories: Map<string, MutableDirectory>;
  files: ContentFile[];
}

function buildTree(documents: readonly CanonicalDocument[]) {
  const root: MutableDirectory = { name: '/', virtualPath: '', href: '/', directories: new Map(), files: [] };
  for (const document of documents) {
    const segments = document.virtualPath.split('/');
    const filename = segments.pop();
    if (filename === undefined) continue;
    let parent = root;
    for (const segment of segments) {
      let child = parent.directories.get(segment);
      if (child === undefined) {
        const virtualPath = parent.virtualPath.length === 0 ? segment : `${parent.virtualPath}/${segment}`;
        child = { name: segment, virtualPath, href: `/${virtualPath}/`, directories: new Map(), files: [] };
        parent.directories.set(segment, child);
      }
      parent = child;
    }
    parent.files.push({ kind: 'file', name: filename, virtualPath: document.virtualPath, href: document.href, document });
  }
  return freezeDirectory(root);
}

function flattenDirectories(root: ContentDirectory): readonly ContentDirectory[] {
  const result: ContentDirectory[] = [];
  const visit = (directory: ContentDirectory) => {
    if (directory.virtualPath.length > 0) result.push(directory);
    for (const child of directory.children) if (child.kind === 'directory') visit(child);
  };
  visit(root);
  return Object.freeze(result);
}

function assertRouteReservations(documents: readonly CanonicalDocument[], directories: readonly ContentDirectory[]) {
  const reservations = new Map<string, string>();
  const reserve = (route: string, owner: string) => {
    if (!route.startsWith('/') || !route.endsWith('/') || route.includes('?') || route.includes('#')) {
      throw new Error(`Noncanonical route reservation: ${route}`);
    }
    const key = collisionKey(route);
    const existing = reservations.get(key);
    if (existing !== undefined) throw new Error(`Route collision between ${existing} and ${owner}.`);
    reservations.set(key, owner);
  };
  reserve('/', 'site root');
  for (const directory of directories) reserve(directory.href, `directory ${directory.virtualPath}`);
  for (const document of documents) {
    reserve(document.href, `document ${document.virtualPath}`);
    for (const alias of document.aliases) reserve(alias, `alias for ${document.virtualPath}`);
  }
}

function assertSupportedPageLayouts(pages: readonly CanonicalDocument[]) {
  const unsupported = pages.filter(({ entry }) => entry.data.layout !== 'page');
  if (unsupported.length > 0) {
    throw new Error(`Unsupported public page layout: ${unsupported.map(({ virtualPath }) => virtualPath).join(', ')}.`);
  }
}

export async function getCanonicalContent(): Promise<CanonicalContent> {
  const [postEntries, pageEntries] = await Promise.all([getCollection('posts'), getCollection('pages')]);
  const all = [...postEntries, ...pageEntries].map(createCanonicalDocument);
  const documents = [...projectContent(all, GUEST_PRINCIPAL)].sort((left, right) => compareCodePoint(left.virtualPath, right.virtualPath));
  const tree = buildTree(documents);
  const directories = flattenDirectories(tree);
  const posts = documents.filter(({ collection }) => collection === 'posts');
  const pages = documents.filter(({ collection }) => collection === 'pages');
  assertSupportedPageLayouts(pages);
  assertRouteReservations(documents, directories);
  return Object.freeze({ documents: Object.freeze(documents), posts: Object.freeze(posts), pages: Object.freeze(pages), tree, directories });
}

export async function getPublicContent() {
  const content = await getCanonicalContent();
  return {
    posts: content.posts.map(({ entry }) => entry as PublicPost),
    pages: content.pages.map(({ entry }) => entry as PublicPage)
  };
}

export async function getPublicPosts() {
  return (await getPublicContent()).posts;
}

export async function getPublicPages() {
  return (await getPublicContent()).pages;
}
