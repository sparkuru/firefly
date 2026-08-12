import { getCollection, type CollectionEntry } from 'astro:content';

export type PublicPost = CollectionEntry<'posts'>;
export type PublicPage = CollectionEntry<'pages'>;

interface PublicContent {
  posts: PublicPost[];
  pages: PublicPage[];
}

function compareByDateThenSlug(
  left: PublicPost | PublicPage,
  right: PublicPost | PublicPage
) {
  const dateDifference = right.data.date.getTime() - left.data.date.getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  if (left.data.slug === right.data.slug) {
    return 0;
  }

  return left.data.slug < right.data.slug ? -1 : 1;
}

function assertSupportedPageLayouts(pages: PublicPage[]) {
  const unsupported = pages.filter((entry) => entry.data.layout !== 'page');

  if (unsupported.length > 0) {
    const details = unsupported
      .map((entry) => `${entry.data.slug} (${entry.data.layout})`)
      .join(', ');

    throw new Error(
      `Unsupported public page layout in M1: ${details}. Only the "page" layout has a public route.`
    );
  }
}

function assertUniquePublicSlugs(entries: Array<PublicPost | PublicPage>) {
  const owners = new Map<string, string>();

  for (const entry of entries) {
    const owner = owners.get(entry.data.slug);

    if (owner) {
      throw new Error(
        `Duplicate public slug "${entry.data.slug}" in ${owner} and ${entry.collection}/${entry.id}.`
      );
    }

    owners.set(entry.data.slug, `${entry.collection}/${entry.id}`);
  }
}

export async function getPublicContent(): Promise<PublicContent> {
  const [allPosts, allPages] = await Promise.all([
    getCollection('posts'),
    getCollection('pages')
  ]);
  const posts = allPosts.filter((entry) => !entry.data.draft);
  const pages = allPages.filter((entry) => !entry.data.draft);

  assertSupportedPageLayouts(pages);
  assertUniquePublicSlugs([...posts, ...pages]);

  posts.sort(compareByDateThenSlug);
  pages.sort(compareByDateThenSlug);

  return { posts, pages };
}

export async function getPublicPosts() {
  return (await getPublicContent()).posts;
}

export async function getPublicPages() {
  return (await getPublicContent()).pages;
}
