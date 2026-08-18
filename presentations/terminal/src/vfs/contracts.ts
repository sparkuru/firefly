export type VirtualPath = string;

export type PublicDocumentKind = 'post' | 'page';

export interface PublicDocument {
  readonly kind: PublicDocumentKind;
  readonly path: VirtualPath;
  readonly relativePath: string;
  readonly filename: string;
  readonly title: string;
  readonly href: string;
  readonly date: string;
}

export interface PublicExperiment {
  readonly id: string;
  readonly title: string;
  readonly href: string;
}

export interface ReadableResource {
  readonly path: VirtualPath;
  readonly lines: readonly string[];
  readonly document?: PublicDocument;
}

export interface DirectoryListing {
  readonly path: VirtualPath;
  readonly directories: readonly string[];
  readonly documents: readonly PublicDocument[];
  readonly experiments: readonly PublicExperiment[];
  readonly files: readonly string[];
}

export type TreeNode =
  | { readonly kind: 'directory'; readonly name: string; readonly path: VirtualPath }
  | { readonly kind: 'document'; readonly name: string; readonly path: VirtualPath; readonly document: PublicDocument }
  | { readonly kind: 'experiment'; readonly name: string; readonly path: VirtualPath; readonly experiment: PublicExperiment }
  | { readonly kind: 'file'; readonly name: string; readonly path: VirtualPath };

export interface TreeLine {
  /** The exact branch glyph and indentation preceding the visible node name. */
  readonly prefix: string;
  readonly node: TreeNode;
}

export type VfsNode =
  | { readonly kind: 'directory'; readonly path: VirtualPath }
  | { readonly kind: 'document'; readonly path: VirtualPath; readonly document: PublicDocument }
  | { readonly kind: 'experiment'; readonly path: VirtualPath; readonly experiment: PublicExperiment }
  | { readonly kind: 'scratch'; readonly path: VirtualPath; readonly name: string };

export type PathResolution =
  | { readonly ok: true; readonly path: VirtualPath }
  | { readonly ok: false; readonly reason: 'unsafe' | 'unknown-root' | 'invalid-pattern' };

export interface ReadonlyVirtualFs {
  resolve(
    input: string,
    cwd: VirtualPath,
    mode: 'directory' | 'resource' | 'pattern'
  ): PathResolution;
  stat(path: VirtualPath): VfsNode | undefined;
  list(path: VirtualPath): DirectoryListing | undefined;
  glob(pattern: VirtualPath): readonly VirtualPath[];
  read(path: VirtualPath): ReadableResource | undefined;
}
