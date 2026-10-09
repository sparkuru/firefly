export const SOURCE_PROVENANCE_FILENAME: string;
export interface SourceProvenance { readonly kind: 'authored' | 'generated'; readonly sourceByteLength: number }
export function readSourceProvenance(collection: string, id: string, options?: { root?: string }): Promise<SourceProvenance>;
