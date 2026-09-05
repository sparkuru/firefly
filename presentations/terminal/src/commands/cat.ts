import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';
import { completePath } from './completion.js';
import { optionalPath, textPolicy } from './descriptors.js';
import type { CommandSpec } from './contracts.js';

export const CAT_USAGE = 'cat [path]';
export const CAT_SUMMARY = 'render a document or stream text';

function unreadableResource(operand: string): ProcessResult {
  return failureResult(`No readable rshell resource named "${operand}". Try "tree" or "tree ~/blog".`);
}

export function executeCat(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  if (operands.length === 0 && context.stdin !== undefined) return successResult(context.stdin.lines);
  if (operands.length !== 1) return failureResult(`Usage: ${CAT_USAGE}`);
  const operand = operands[0]!;
  const resolution = context.fs.resolve(operand, context.cwd, 'resource');
  if (!resolution.ok) return unreadableResource(operand);
  const node = context.fs.stat(resolution.path);
  if (node?.kind === 'experiment') {
    return failureResult(`Cannot read rshell experiment "${operand}" as a document. Try "open ${operand}".`);
  }
  if (node?.kind === 'directory') {
    return failureResult(`Cannot read rshell directory "${operand}" as a document. Try "ls ${operand}".`);
  }
  const resource = context.fs.read(resolution.path);
  if (resource === undefined) return unreadableResource(operand);
  return successResult(resource.lines, resource.document === undefined ? {} : { value: { kind: 'document', document: resource.document } });
}

export const CAT_COMMAND_SPEC: CommandSpec = {
  name: 'cat',
  aliases: Object.freeze([]),
  usage: CAT_USAGE,
  summary: CAT_SUMMARY,
  group: 'Read & navigate',
  order: 10,
  policy: textPolicy,
  parse: optionalPath(CAT_USAGE),
  execute: executeCat,
  complete: completePath
};
