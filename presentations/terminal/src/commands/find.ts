import type { ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import { createCommandArgumentParser, type ParsedCommandArguments } from './arguments.js';
import { formatDocument } from './document-format.js';
import type { VfsNode } from '../vfs/contracts.js';
import { publicDocumentSearchRoots, walkPublicDocuments } from '../vfs/public-documents.js';
import { textPolicy } from './descriptors.js';
import type { CommandSpec } from './contracts.js';

export const FIND_USAGE = 'find [--path <directory>] [--after YYYY-MM-DD] [--before YYYY-MM-DD] [path] <keyword>';
export const FIND_SUMMARY = 'find public documents by filename substring';

const maxKeywordLength = 256;
const FIND_EXAMPLES = Object.freeze([
  Object.freeze({ command: 'find ~/blog/posts xxxx', description: 'search filenames below a public directory' }),
  Object.freeze({ command: 'find --path ~/blog/posts xxxx', description: 'search filenames below a public directory' })
]);

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
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

function exampleLines(): readonly string[] {
  return Object.freeze(['Examples:', ...FIND_EXAMPLES.map(({ command, description }) => `  ${command} — ${description}`)]);
}

function resolvePublicSearchRoots(
  context: ProcessContext,
  pathOperand: string | undefined
): readonly string[] | undefined {
  if (pathOperand === undefined) {
    if (context.fs.stat(context.cwd)?.kind !== 'directory') return undefined;
    return publicDocumentSearchRoots(context.cwd);
  }
  const resolution = context.fs.resolve(pathOperand, context.cwd, 'directory');
  if (!resolution.ok || publicDocumentSearchRoots(resolution.path) === undefined || context.fs.stat(resolution.path)?.kind !== 'directory') {
    return undefined;
  }
  return publicDocumentSearchRoots(resolution.path);
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
      '  --before YYYY-MM-DD  include documents published on or before this date.',
      ...exampleLines()
    ]);
  }

  if (operands.length < 1 || operands.length > 2) return failureResult(`Usage: ${FIND_USAGE}`);
  const pathOperand = optionText(options, 'path');
  const positionalPath = operands.length === 2 ? operands[0] : undefined;
  if (pathOperand !== undefined && positionalPath !== undefined) return failureResult(`Usage: ${FIND_USAGE}`);
  const keyword = (operands.length === 2 ? operands[1] : operands[0])!;
  if (!validKeyword(keyword)) return failureResult(`Usage: ${FIND_USAGE}`);
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

  const roots = resolvePublicSearchRoots(context, pathOperand ?? positionalPath);
  if (roots === undefined) return failureResult('find --path accepts only known public virtual directories.');

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

  return matches.length === 0
    ? noResults(keyword)
    : successResult(matches.map(formatDocument), {
      value: {
        kind: 'document-search',
        keyword,
        documents: Object.freeze(matches)
      }
    });
}

const findArguments = createCommandArgumentParser({
  usage: FIND_USAGE,
  maxOperands: 2,
  options: [
    { name: 'path', aliases: ['--path'], value: 'required' },
    { name: 'after', aliases: ['--after'], value: 'required' },
    { name: 'before', aliases: ['--before'], value: 'required' },
    { name: 'help', aliases: ['-h', '--help'] }
  ]
});

export const FIND_COMMAND_SPEC: CommandSpec = {
  name: 'find',
  aliases: Object.freeze([]),
  usage: FIND_USAGE,
  summary: FIND_SUMMARY,
  group: 'Explore',
  order: 25,
  policy: textPolicy,
  parse: findArguments,
  execute: executeFind,
  examples: FIND_EXAMPLES
};
