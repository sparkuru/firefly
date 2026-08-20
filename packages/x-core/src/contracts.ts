import type { Root as HastRoot } from 'hast';

export const X_CORE_METADATA_VERSION = 1 as const;
export const DEFAULT_PRESENTATION_ID = 'firefly' as const;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type DocumentCollection = 'posts' | 'pages';
export type DocumentLayout = 'post' | 'page' | 'timeline' | 'files';
export type EnhancementLoadingStrategy = 'eager' | 'idle' | 'visible';
export type ReferenceKind = 'fragment' | 'internal' | 'relative' | 'external';
export type ReferenceRole = 'link' | 'resource';

export interface DocumentContext {
  readonly documentId: string;
  readonly sourcePath?: string;
  readonly route: string;
  readonly collection: DocumentCollection;
  readonly slug: string;
  readonly layout: DocumentLayout;
  readonly presentation: string;
}

export interface DocumentReference {
  readonly role: ReferenceRole;
  readonly kind: ReferenceKind;
  readonly target: string;
}

export interface OutlineItem {
  readonly depth: number;
  readonly id: string;
  readonly text: string;
}

export interface Enhancement {
  readonly nodeId: string;
  readonly feature: string;
  readonly module: string;
  readonly load: EnhancementLoadingStrategy;
  readonly props: Readonly<Record<string, JsonValue>>;
}

export interface NormalizedDocumentInput {
  readonly context: DocumentContext;
  readonly summary: string;
  readonly references: readonly DocumentReference[];
  readonly tree: HastRoot;
}

export interface PresentationAdapter {
  readonly id: string;
  supports(context: DocumentContext): boolean;
  transform(input: NormalizedDocumentInput): HastRoot;
  enhancements(input: NormalizedDocumentInput): readonly Enhancement[];
}

export interface DiagnosticDocument {
  readonly documentId: string;
  readonly sourcePath?: string;
  readonly route: string;
}

export interface XCoreDiagnostic {
  readonly severity: 'error' | 'warning';
  readonly code: `XCORE_${string}`;
  readonly message: string;
  readonly document?: DiagnosticDocument;
  readonly nodeId?: string;
}

export interface XCoreMetadata {
  readonly version: typeof X_CORE_METADATA_VERSION;
  readonly presentation: string;
  readonly summary: string;
  readonly references: readonly DocumentReference[];
  readonly outline: readonly OutlineItem[];
  readonly enhancements: readonly Enhancement[];
}

export type DocumentContextResolver = (file: {
  readonly path?: string;
  readonly data: Readonly<Record<string, unknown>>;
}) => DocumentContext;
