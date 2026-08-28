export interface RouteCatalog {
  readonly postPaths: ReadonlySet<string>;
}

export type RouteCatalogInput = RouteCatalog | Iterable<string>;

export interface PublicComment {
  readonly id: string;
  readonly postPath: string;
  readonly parentId: string | null;
  readonly displayName: string;
  readonly homepage?: string;
  readonly body: string;
  readonly createdAt: string;
}

export interface PublicCommentsExport {
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly generatedAt: string;
  readonly tombstoneEpoch: number;
  readonly comments: readonly PublicComment[];
  readonly digest?: string;
}

export type PublicExport = PublicCommentsExport;

export class PublicCommentsContractError extends TypeError {
  constructor(message: string);
}

export const PUBLIC_EXPORT_SCHEMA_VERSION: 1;
export const MAX_DISPLAY_NAME_CODE_POINTS: 80;
export const MAX_BODY_BYTES: 8192;
export const EMPTY_PUBLIC_COMMENTS_EXPORT: PublicCommentsExport;

export function emptyPublicCommentsExport(): PublicCommentsExport;
export function isCanonicalCommentsPostRoute(value: unknown): value is string;
export function commentsPostPathFromSiteHref(value: unknown): string | null;
export function createRouteCatalog(postPaths: Iterable<string>): RouteCatalog;
export function toRouteCatalog(input: RouteCatalogInput): RouteCatalog;
export function normalizePostPath(value: unknown): string;
export function assertKnownPostPath(postPath: string, catalog: RouteCatalog): void;
export function normalizeDisplayName(value: unknown): string;
export function normalizeBody(value: unknown): string;
export function normalizeHomepage(value: unknown): string | null;
export function normalizePublicId(value: unknown): string;
export function validatePublicComment(
  value: unknown,
  catalog?: RouteCatalogInput,
  seen?: Set<string>
): PublicComment;
export function comparePublicComments(left: PublicComment, right: PublicComment): number;
export function digestForExport(
  value: Pick<PublicCommentsExport, 'schemaVersion' | 'sourceRevision' | 'generatedAt' | 'tombstoneEpoch'> & {
    readonly comments: readonly PublicComment[];
  }
): string;
export function decodePublicCommentsExport(
  value: unknown,
  source?: string,
  options?: { readonly routeCatalog?: RouteCatalogInput }
): PublicCommentsExport;
export function serializePublicExport(value: PublicCommentsExport): string;
export function createPublicExport(
  value: Omit<PublicCommentsExport, 'digest'>,
  catalog?: RouteCatalogInput
): PublicCommentsExport;
