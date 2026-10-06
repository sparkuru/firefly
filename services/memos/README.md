# Retired interactive Memo service

The HTTP submission, email verification, moderation and SMTP worker product was
retired in favor of owner-authored static Markdown publication. It has no package,
image, Compose service or public write proxy in the maintained build.

Use `tooling/publish-memos/publish.sh` and its operation guide. Existing private
Memo databases, keys and recovery backups are retained owner-managed material.
Repository retirement does not delete or import them. Recovery requires the
matching historical service image/source and keys; never reset the retained
publication floor or copy legacy private records into the owner stream.
