import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';
import { completeDirectory } from './completion.js';
import { optionalPath, standalonePolicy } from './descriptors.js';
import type { CommandSpec } from './contracts.js';

export const CD_USAGE = 'cd [path]';
export const CD_SUMMARY = 'change the virtual directory';

export function executeCd(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  if (operands.length > 1) return failureResult(`Usage: ${CD_USAGE}`);
  const resolution = context.fs.resolve(operands[0] ?? '~/blog', context.cwd, 'directory');
  if (!resolution.ok) return failureResult('cd accepts only listed public directories.');
  const node = context.fs.stat(resolution.path);
  if (node?.kind !== 'directory' || resolution.path.startsWith('/.rshell')) {
    return failureResult('cd accepts only listed public directories.');
  }
  return successResult([], { statePatch: { kind: 'cwd', cwd: resolution.path } });
}

export const CD_COMMAND_SPEC: CommandSpec = {
  name: 'cd',
  aliases: Object.freeze([]),
  usage: CD_USAGE,
  summary: CD_SUMMARY,
  group: 'Read & navigate',
  order: 40,
  policy: standalonePolicy,
  parse: optionalPath(CD_USAGE),
  execute: executeCd,
  complete: completeDirectory
};
