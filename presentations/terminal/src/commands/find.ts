import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';
import { formatDocument } from './document-format.js';
import type { VfsNode } from '../vfs/contracts.js';
import { walkPublicDocuments } from '../vfs/public-documents.js';

export const FIND_USAGE = 'find [--path <directory>] [--after YYYY-MM-DD] [--before YYYY-MM-DD] <keyword>';
export const FIND_SUMMARY = 'find public documents by filename substring';

const maxKeywordLength = 256;

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isPublicDirectory(path: string): boolean {
  return path === '/' ||
    path === '/posts' || path.startsWith('/posts/') ||
    path === '/pages' || path.startsWith('/pages/');
}

function optionText(
  options: Readonly<Record<string, true | string>>,
  name: string
): string | undefined {
  const value = options[name];
  return value === undefined ? undefined : typeof value === 'string' ? value : '';
}

function validKeyword(keyword: string): boolean {
  return keyword.length > 0 && keyword.length <= maxKeywordLength && !/[\u0000-\u001f\u007f]/u.test(keyword);
}

function noResults(keyword: string): ProcessResult {
  return successResult([`No matches for "${keyword}".`]);
}

export function executeFind(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { options, operands } = args;
  if (options.help === true) {
    if (operands.length > 0 || Object.keys(options).some((name) => name !== 'help')) {
      return failureResult(`Usage: ${FIND_USAGE}`);
    }
    return successResult([
      `Usage: ${FIND_USAGE}`,
      FIND_SUMMARY,
      'Options:',
      '  --path <directory>   search recursively below one public virtual directory.',
      '  --after YYYY-MM-DD   include documents published on or after this date.',
      '  --before YYYY-MM-DD  include documents published on or before this date.'
    ]);
  }

  if (operands.length !== 1 || !validKeyword(operands[0] ?? '')) return failureResult(`Usage: ${FIND_USAGE}`);
  const keyword = operands[0]!;
  const pathOperand = optionText(options, 'path');
  const after = optionText(options, 'after');
  const before = optionText(options, 'before');
  if ((pathOperand !== undefined && pathOperand.length === 0) ||
    (after !== undefined && (after.length === 0 || !isCalendarDate(after))) ||
    (before !== undefined && (before.length === 0 || !isCalendarDate(before)))) {
    return failureResult(`Usage: ${FIND_USAGE}`);
  }
  if (after !== undefined && before !== undefined && after > before) {
    return failureResult('find --after cannot be later than --before.');
  }

  let roots: readonly string[];
  if (pathOperand === undefined) {
    roots = Object.freeze(['/posts', '/pages']);
  } else {
    const resolution = context.fs.resolve(pathOperand, context.cwd, 'directory');
    if (!resolution.ok || !isPublicDirectory(resolution.path) || context.fs.stat(resolution.path)?.kind !== 'directory') {
      return failureResult('find --path accepts only known public virtual directories.');
    }
    roots = resolution.path === '/'
      ? Object.freeze(['/posts', '/pages'])
      : Object.freeze([resolution.path]);
  }

  const walked = roots.map((root) => walkPublicDocuments(context.fs, root));
  if (walked.some(({ complete }) => !complete)) return failureResult('find search scope exceeds the session work limit.');
  const documentPaths = [...new Set(walked.flatMap(({ paths }) => paths))].sort();
  const foldedKeyword = keyword.normalize('NFC').toLocaleLowerCase('en-US');
  const matches = documentPaths
    .map((path) => context.fs.stat(path))
    .filter((node): node is Extract<VfsNode, { kind: 'document' }> => node?.kind === 'document')
    .filter(({ document }) => {
      const foldedFilename = document.filename.normalize('NFC').toLocaleLowerCase('en-US');
      return foldedFilename.includes(foldedKeyword) &&
        (after === undefined || document.date >= after) &&
        (before === undefined || document.date <= before);
    })
    .map(({ document }) => document)
    .sort((left, right) => left.path.localeCompare(right.path));

  return matches.length === 0 ? noResults(keyword) : successResult(matches.map(formatDocument));
}
