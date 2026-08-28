export type SiteCollection = 'posts' | 'pages';

export interface CanonicalRouteInput {
  readonly collection: SiteCollection;
  readonly relativePath?: string;
  readonly slug: string;
}

/**
 * Project a validated site collection/path/slug tuple into a canonical public
 * directory route. Posts require a safe relative Markdown path; pages use
 * only their canonical slug.
 */
export function projectCanonicalRoute(input: CanonicalRouteInput): string;
