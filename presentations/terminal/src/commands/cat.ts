import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';

export const CAT_USAGE = 'cat [path]';
export const CAT_SUMMARY = 'render a document or stream text';

export function executeCat(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  if (operands.length === 0 && context.stdin !== undefined) return successResult(context.stdin.lines);
  if (operands.length !== 1) return failureResult(`Usage: ${CAT_USAGE}`);
  const operand = operands[0]!;
  const resolution = context.fs.resolve(operand, context.cwd, 'resource');
  if (!resolution.ok) {
    return failureResult(`No readable rshell resource named "${operand}". Relative paths resolve under posts; pages require /pages/<path>.md.`);
  }
  const resource = context.fs.read(resolution.path);
  if (resource === undefined) {
    return failureResult(`No readable rshell resource named "${operand}". Relative paths resolve under posts; pages require /pages/<path>.md.`);
  }
  return successResult(resource.lines, resource.document === undefined ? {} : { value: { kind: 'document', document: resource.document } });
}
