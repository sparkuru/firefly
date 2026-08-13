export const GUEST_PRINCIPAL = Object.freeze({ kind: 'guest' });

export function projectContentForPrincipal(documents, principal) {
  return Object.freeze(documents.filter(({ entry }) => {
    if (entry.data.draft) {
      return false;
    }
    const access = entry.data.access;
    if (principal.kind === 'admin') {
      return true;
    }
    if (access.visibility === 'public') {
      return true;
    }
    return principal.kind === 'user' && access.owner === principal.subject;
  }));
}
