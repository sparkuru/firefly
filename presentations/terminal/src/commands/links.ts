import type { ProcessContext, ProcessResult, ShellLink } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';

export const FRIENDS_USAGE = 'friends';
export const FRIENDS_SUMMARY = 'list curated friend links';

export function formatFriendLink(link: ShellLink): string {
  return link.desc === undefined
    ? `${link.name} — ${link.url}`
    : `${link.name} — ${link.desc} — ${link.url}`;
}

function freezeLinks(links: readonly ShellLink[]): readonly ShellLink[] {
  return Object.freeze(links.map((link) => Object.freeze({
    name: link.name,
    ...(link.desc === undefined ? {} : { desc: link.desc }),
    url: link.url
  })));
}

export function executeFriends(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  if (args.operands.length !== 0) return failureResult(`Usage: ${FRIENDS_USAGE}`);
  const links = freezeLinks(context.friendLinks ?? Object.freeze([]));
  return successResult(links.map(formatFriendLink), {
    value: { kind: 'links', links }
  });
}
