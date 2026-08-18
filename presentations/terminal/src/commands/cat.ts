import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';

export const CAT_USAGE = 'cat [path]';
export const CAT_SUMMARY = 'render a document or stream text';

function unreadableResource(operand: string): ProcessResult {
  return failureResult(`No readable rshell resource named "${operand}". Try "tree" or "tree /".`);
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
    return failureResult(`Cannot read rshell experiment "${operand}" as a document. Try "open lab/${node.experiment.id}".`);
  }
  if (node?.kind === 'directory') {
    return failureResult(`Cannot read rshell directory "${operand}" as a document. Try "ls ${operand}".`);
  }
  const resource = context.fs.read(resolution.path);
  if (resource === undefined) return unreadableResource(operand);
  return successResult(resource.lines, resource.document === undefined ? {} : { value: { kind: 'document', document: resource.document } });
}
