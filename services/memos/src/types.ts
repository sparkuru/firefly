export const VERIFICATION_TTL = 24 * 60 * 60 * 1000;
export const RATE_WINDOW = 60 * 60 * 1000;
export const RATE_LIMIT = 12;
export const PRIVATE_RETENTION = 30 * 24 * 60 * 60 * 1000;
export const MAX_REQUEST_BYTES = 32 * 1024;
export const MAIL_LEASE = 5 * 60 * 1000;
export type State = 'unverified' | 'expired' | 'pending' | 'approved' | 'rejected' | 'deleted';
export type Action = 'approve' | 'reject' | 'delete';
export interface Submission { readonly displayName: string; readonly email: string; readonly body: string; readonly consentVersion: string }
export interface ModerationMemo { readonly id: string; readonly displayName: string; readonly body: string; readonly createdAt: string; readonly state: State; readonly verifiedAt: string | null }
export interface MailMessage { readonly id: string; readonly to: string; readonly token: string; readonly publicOrigin: string }
export interface DeliveryTransport { deliver(message: MailMessage): Promise<void> }
export class ServiceError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); this.name = 'ServiceError'; }
}
