import { SITE_CONFIG } from './site-config.mjs';

function routePath(pathname) {
  if (typeof pathname !== 'string' || pathname.length === 0 || !pathname.startsWith('/')) return '/';
  if (pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export function absoluteSiteUrl(origin, pathname) {
  if (origin === null || origin === undefined) return undefined;
  return new URL(routePath(pathname), `${origin}/`).toString();
}

export function resolveImageUrl(reference, origin) {
  if (reference === undefined || reference === null) return undefined;
  if (reference.startsWith('http://') || reference.startsWith('https://')) return reference;
  return origin === null || origin === undefined ? reference : new URL(reference, `${origin}/`).toString();
}

export function resolveSiteMetadata(options, config = SITE_CONFIG) {
  const pathname = routePath(options.pathname ?? '/');
  const visibleTitle = options.title ?? config.site.name;
  const htmlTitle = options.htmlTitle ?? (options.home || pathname === '/' ? config.site.name : `${visibleTitle}${config.seo.titleSuffix}`);
  const description = options.description ?? config.site.description;
  const canonical = options.canonical ?? absoluteSiteUrl(config.site.url, pathname);
  const image = resolveImageUrl(options.seoImage ?? config.seo.image, config.site.url);
  const noindex = options.noindex === true;
  const metadata = {
    htmlTitle,
    description,
    canonical,
    robots: noindex ? 'noindex, follow' : config.seo.robots,
    openGraph: {
      title: htmlTitle,
      description,
      ...(canonical === undefined ? {} : { url: canonical }),
      type: options.collection === 'posts' ? 'article' : 'website',
      ...(image === undefined ? {} : { image })
    },
    twitter: {
      card: config.seo.twitterCard,
      title: htmlTitle,
      description,
      ...(image === undefined ? {} : { image })
    },
    ...(options.collection === 'posts' && options.date instanceof Date ? {
      article: {
        publishedTime: options.date.toISOString(),
        ...(options.updated instanceof Date ? { modifiedTime: options.updated.toISOString() } : {}),
        ...(config.site.author === null ? {} : { author: config.site.author })
      }
    } : {})
  };
  return Object.freeze(metadata);
}
