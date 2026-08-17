import type { ProcessResult, TextStream } from './contracts.js';

export const EMPTY_TEXT_STREAM: TextStream = Object.freeze({
  lines: Object.freeze([])
});

export function textStream(lines: readonly string[]): TextStream {
  return Object.freeze({ lines: Object.freeze([...lines]) });
}

export function processResult(
  status: number,
  stdout: readonly string[] = [],
  stderr: readonly string[] = [],
  extras: Omit<ProcessResult, 'status' | 'stdout' | 'stderr'> = {}
): ProcessResult {
  return Object.freeze({
    status,
    stdout: textStream(stdout),
    stderr: textStream(stderr),
    ...extras
  });
}

export function successResult(
  stdout: readonly string[] = [],
  extras: Omit<ProcessResult, 'status' | 'stdout' | 'stderr'> = {}
): ProcessResult {
  return processResult(0, stdout, [], extras);
}

export function failureResult(
  message: string,
  status = 1
): ProcessResult {
  return processResult(status, [], [message]);
}
