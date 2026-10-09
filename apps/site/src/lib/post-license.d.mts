export const POST_LICENSE_IDS: readonly ['CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-ND-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC-BY-NC-ND-4.0'];
export type PostLicenseId = typeof POST_LICENSE_IDS[number];
export const DEFAULT_POST_LICENSE: 'CC-BY-NC-4.0';
export const POST_LICENSES: Readonly<Record<PostLicenseId, Readonly<{ label: string; href: string }>>>;
export function getPostLicense(id: unknown): Readonly<{ label: string; href: string }>;
