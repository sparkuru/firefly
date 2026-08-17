import type { GrepMatch, GrepReport, ProcessContext, ProcessResult } from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';

export const GREP_USAGE = 'grep [-inF] <pattern> [path ...]';
export const GREP_SUMMARY = 'filter stdin or public text';

const maxResources = 256;
const maxLines = 50_000;
const maxMatches = 240;
const maxText = 24_000;

type RegexAtom =
  | { readonly type: 'literal'; readonly value: string }
  | { readonly type: 'any' }
  | { readonly type: 'class'; readonly inverted: boolean; readonly items: readonly (readonly [string, string])[] }
  | { readonly type: 'start' }
  | { readonly type: 'end' }
  | { readonly type: 'concat'; readonly values: readonly RegexAtom[] }
  | { readonly type: 'alt'; readonly values: readonly RegexAtom[] }
  | { readonly type: 'repeat'; readonly value: RegexAtom; readonly minimum: number; readonly maximum: number | null };

interface RegexParser {
  readonly characters: readonly string[];
  index: number;
  depth: number;
}

function escapedAtom(character: string): RegexAtom | undefined {
  const range = (first: string, last: string): readonly [string, string] => Object.freeze([first, last]);
  if (character === 'd') return { type: 'class', inverted: false, items: Object.freeze([range('0', '9')]) };
  if (character === 'D') return { type: 'class', inverted: true, items: Object.freeze([range('0', '9')]) };
  if (character === 'w') return { type: 'class', inverted: false, items: Object.freeze([range('0', '9'), range('A', 'Z'), range('a', 'z'), range('_', '_')]) };
  if (character === 'W') return { type: 'class', inverted: true, items: Object.freeze([range('0', '9'), range('A', 'Z'), range('a', 'z'), range('_', '_')]) };
  if (character === 's') return { type: 'class', inverted: false, items: Object.freeze([range(' ', ' '), range('\t', '\t')]) };
  if (character === 'S') return { type: 'class', inverted: true, items: Object.freeze([range(' ', ' '), range('\t', '\t')]) };
  if ('123456789'.includes(character)) return undefined;
  return { type: 'literal', value: character };
}

function parseClass(parser: RegexParser): RegexAtom | undefined {
  let inverted = false;
  if (parser.characters[parser.index] === '^') { inverted = true; parser.index += 1; }
  const items: (readonly [string, string])[] = [];
  while (parser.index < parser.characters.length && parser.characters[parser.index] !== ']') {
    let first = parser.characters[parser.index++]!;
    if (first === '\\') {
      const escaped = parser.characters[parser.index++];
      if (escaped === undefined) return undefined;
      const special = escapedAtom(escaped);
      if (special?.type === 'class' && !special.inverted) { items.push(...special.items); continue; }
      if (special === undefined || special.type !== 'literal') return undefined;
      first = special.value;
    }
    let last = first;
    if (parser.characters[parser.index] === '-' && parser.characters[parser.index + 1] !== ']') {
      parser.index += 1;
      last = parser.characters[parser.index++]!;
      if (last === '\\') {
        const escaped = parser.characters[parser.index++];
        if (escaped === undefined) return undefined;
        const special = escapedAtom(escaped);
        if (special === undefined || special.type !== 'literal') return undefined;
        last = special.value;
      }
      if (first.codePointAt(0)! > last.codePointAt(0)!) return undefined;
    }
    items.push(Object.freeze([first, last] as [string, string]));
  }
  if (parser.characters[parser.index] !== ']' || items.length === 0) return undefined;
  parser.index += 1;
  return { type: 'class', inverted, items: Object.freeze(items) };
}

function parseRegexAtom(parser: RegexParser): RegexAtom | undefined {
  const character = parser.characters[parser.index++];
  if (character === undefined) return { type: 'concat', values: Object.freeze([]) };
  if (character === '.') return { type: 'any' };
  if (character === '^') return { type: 'start' };
  if (character === '$') return { type: 'end' };
  if (character === '[') return parseClass(parser);
  if (character === '\\') {
    const escaped = parser.characters[parser.index++];
    return escaped === undefined ? undefined : escapedAtom(escaped);
  }
  if (character === '(') {
    if (parser.characters[parser.index] === '?' || parser.depth >= 16) return undefined;
    parser.depth += 1;
    const inner = parseRegexAlternation(parser);
    parser.depth -= 1;
    if (parser.characters[parser.index] !== ')') return undefined;
    parser.index += 1;
    return inner;
  }
  if (character === ')' || character === '|' || character === '*' || character === '+' || character === '?' || character === '{' || character === '}') return undefined;
  return { type: 'literal', value: character };
}

function parseRepeat(parser: RegexParser): RegexAtom | undefined {
  let value = parseRegexAtom(parser);
  if (value === undefined) return undefined;
  const marker = parser.characters[parser.index];
  if (marker === '*') { parser.index += 1; return { type: 'repeat', value, minimum: 0, maximum: null }; }
  if (marker === '+') { parser.index += 1; return { type: 'repeat', value, minimum: 1, maximum: null }; }
  if (marker === '?') { parser.index += 1; return { type: 'repeat', value, minimum: 0, maximum: 1 }; }
  if (marker !== '{') return value;
  parser.index += 1;
  const digits = (): number | undefined => {
    let raw = '';
    while (parser.characters[parser.index] !== undefined && '0123456789'.includes(parser.characters[parser.index]!)) raw += parser.characters[parser.index++]!;
    return raw.length === 0 ? undefined : Number(raw);
  };
  const minimum = digits();
  if (minimum === undefined || minimum > 64) return undefined;
  let maximum: number | null = minimum;
  if (parser.characters[parser.index] === ',') { parser.index += 1; maximum = parser.characters[parser.index] === '}' ? null : digits() ?? -1; }
  if (parser.characters[parser.index] !== '}' || maximum === -1 || (maximum !== null && (maximum < minimum || maximum > 64))) return undefined;
  parser.index += 1;
  return { type: 'repeat', value, minimum, maximum };
}

function parseRegexSequence(parser: RegexParser): RegexAtom | undefined {
  const values: RegexAtom[] = [];
  while (parser.index < parser.characters.length && parser.characters[parser.index] !== ')' && parser.characters[parser.index] !== '|') {
    const value = parseRepeat(parser);
    if (value === undefined) return undefined;
    values.push(value);
  }
  return { type: 'concat', values: Object.freeze(values) };
}

function parseRegexAlternation(parser: RegexParser): RegexAtom | undefined {
  const values: RegexAtom[] = [];
  const first = parseRegexSequence(parser);
  if (first === undefined) return undefined;
  values.push(first);
  while (parser.characters[parser.index] === '|') {
    parser.index += 1;
    const next = parseRegexSequence(parser);
    if (next === undefined) return undefined;
    values.push(next);
  }
  return values.length === 1 ? values[0] : { type: 'alt', values: Object.freeze(values) };
}

type RegexState =
  | { readonly kind: 'char'; readonly value: string; to: number }
  | { readonly kind: 'any'; to: number }
  | { readonly kind: 'class'; readonly inverted: boolean; readonly items: readonly (readonly [string, string])[]; to: number }
  | { readonly kind: 'start'; to: number }
  | { readonly kind: 'end'; to: number }
  | { readonly kind: 'epsilon'; to: number }
  | { readonly kind: 'split'; to: number; alternate: number }
  | { readonly kind: 'match' };

interface Fragment { readonly start: number; readonly outs: readonly (readonly [number, 'to' | 'alternate'])[] }

interface SafeRegexMatcher {
  readonly test: (line: string) => boolean;
  readonly ranges: (line: string) => readonly (readonly [number, number])[];
}

function compileSafeRegex(pattern: string, insensitive: boolean): SafeRegexMatcher | undefined {
  if (pattern.length === 0 || pattern.length > 256) return undefined;
  const parser: RegexParser = { characters: Object.freeze([...pattern]), index: 0, depth: 0 };
  const ast = parseRegexAlternation(parser);
  if (ast === undefined || parser.index !== parser.characters.length) return undefined;
  const states: RegexState[] = [];
  const add = (state: RegexState): number => { states.push(state); return states.length - 1; };
  const out = (index: number, key: 'to' | 'alternate'): readonly [number, 'to' | 'alternate'] => Object.freeze([index, key]);
  const patch = (outs: readonly (readonly [number, 'to' | 'alternate'])[], target: number): void => {
    for (const [index, key] of outs) {
      const state = states[index]!;
      if (key === 'alternate') {
        if (state.kind !== 'split') throw new TypeError('Invalid regular-expression branch.');
        state.alternate = target;
      } else {
        if (!('to' in state)) throw new TypeError('Invalid regular-expression transition.');
        state.to = target;
      }
    }
  };
  const join = (values: readonly RegexAtom[]): Fragment => {
    if (values.length === 0) { const start = add({ kind: 'epsilon', to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    let fragment = compile(values[0]!);
    for (const value of values.slice(1)) { const next = compile(value); patch(fragment.outs, next.start); fragment = { start: fragment.start, outs: next.outs }; }
    return fragment;
  };
  const compile = (node: RegexAtom): Fragment => {
    if (node.type === 'literal') { const start = add({ kind: 'char', value: node.value, to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'any') { const start = add({ kind: 'any', to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'class') { const start = add({ kind: 'class', inverted: node.inverted, items: node.items, to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'start' || node.type === 'end') { const start = add({ kind: node.type, to: -1 }); return { start, outs: Object.freeze([out(start, 'to')]) }; }
    if (node.type === 'concat') return join(node.values);
    if (node.type === 'alt') {
      const values = node.values.map(compile);
      let start = values[0]!.start;
      let outs = [...values[0]!.outs];
      for (const value of values.slice(1)) { const split = add({ kind: 'split', to: start, alternate: value.start }); start = split; outs = [...outs, ...value.outs]; }
      return { start, outs: Object.freeze(outs) };
    }
    const repeated: RegexAtom[] = [];
    for (let index = 0; index < node.minimum; index += 1) repeated.push(node.value);
    let fragment = join(repeated);
    if (node.maximum === null) {
      const body = compile(node.value);
      const split = add({ kind: 'split', to: body.start, alternate: -1 });
      patch(fragment.outs, split); patch(body.outs, split);
      return { start: fragment.start, outs: Object.freeze([out(split, 'alternate')]) };
    }
    for (let index = node.minimum; index < node.maximum; index += 1) {
      const body = compile(node.value);
      const split = add({ kind: 'split', to: body.start, alternate: -1 });
      patch(fragment.outs, split);
      fragment = { start: fragment.start, outs: Object.freeze([...body.outs, out(split, 'alternate')]) };
    }
    return fragment;
  };
  const fragment = compile(ast);
  if (states.length > 2_048) return undefined;
  const match = add({ kind: 'match' });
  patch(fragment.outs, match);
  const fold = (value: string): string => insensitive ? value.toLocaleLowerCase('en-US') : value;
  const addClosure = (set: Set<number>, index: number, position: number, length: number, seen: Set<number>): void => {
    if (seen.has(index)) return;
    seen.add(index);
    const state = states[index]!;
    if (state.kind === 'epsilon') addClosure(set, state.to, position, length, seen);
    else if (state.kind === 'split') { addClosure(set, state.to, position, length, seen); addClosure(set, state.alternate, position, length, seen); }
    else if (state.kind === 'start') { if (position === 0) addClosure(set, state.to, position, length, seen); }
    else if (state.kind === 'end') { if (position === length) addClosure(set, state.to, position, length, seen); }
    else set.add(index);
  };
  const charMatches = (state: RegexState, character: string): boolean => {
    const folded = fold(character);
    if (state.kind === 'char') return folded === fold(state.value);
    if (state.kind === 'any') return true;
    if (state.kind !== 'class') return false;
    const point = folded.codePointAt(0)!;
    const inside = state.items.some(([first, last]) => point >= fold(first).codePointAt(0)! && point <= fold(last).codePointAt(0)!);
    return state.inverted ? !inside : inside;
  };
  const matchFrom = (characters: readonly string[], start: number): number | undefined => {
    let current = new Set<number>();
    addClosure(current, fragment.start, start, characters.length, new Set());
    for (let position = start; position <= characters.length; position += 1) {
      if (current.has(match)) return position;
      if (position === characters.length) break;
      const next = new Set<number>();
      for (const index of current) {
        const state = states[index]!;
        if ((state.kind === 'char' || state.kind === 'any' || state.kind === 'class') && charMatches(state, characters[position]!)) addClosure(next, state.to, position + 1, characters.length, new Set());
      }
      current = next;
    }
    return undefined;
  };
  return {
    test: (line: string): boolean => {
      const characters = [...line];
      let current = new Set<number>();
      addClosure(current, fragment.start, 0, characters.length, new Set());
      for (let position = 0; position <= characters.length; position += 1) {
        if (current.has(match)) return true;
        if (position === characters.length) break;
        const next = new Set<number>();
        for (const index of current) {
          const state = states[index]!;
          if ((state.kind === 'char' || state.kind === 'any' || state.kind === 'class') && charMatches(state, characters[position]!)) addClosure(next, state.to, position + 1, characters.length, new Set());
        }
        addClosure(next, fragment.start, position + 1, characters.length, new Set());
        current = next;
      }
      return current.has(match);
    },
    ranges: (line: string): readonly (readonly [number, number])[] => {
      const characters = [...line];
      const offsets = [0];
      for (const character of characters) offsets.push(offsets.at(-1)! + character.length);
      const result: (readonly [number, number])[] = [];
      let start = 0;
      while (start < characters.length && result.length < 64) {
        const end = matchFrom(characters, start);
        if (end === undefined) { start += 1; continue; }
        if (end > start) { result.push(Object.freeze([offsets[start]!, offsets[end]!] as [number, number])); start = end; }
        else start += 1;
      }
      return Object.freeze(result);
    }
  };
}

function literalMatcher(pattern: string, insensitive: boolean): SafeRegexMatcher {
  const foldedPattern = insensitive ? pattern.toLocaleLowerCase('en-US') : pattern;
  return {
    test: (line: string): boolean => (insensitive ? line.toLocaleLowerCase('en-US') : line).includes(foldedPattern),
    ranges: (line: string): readonly (readonly [number, number])[] => {
      const source = insensitive ? line.toLocaleLowerCase('en-US') : line;
      const result: (readonly [number, number])[] = [];
      let cursor = 0;
      while (cursor < source.length && result.length < 64) {
        const start = source.indexOf(foldedPattern, cursor);
        if (start === -1) break;
        result.push(Object.freeze([start, start + foldedPattern.length] as [number, number]));
        cursor = start + Math.max(1, foldedPattern.length);
      }
      return Object.freeze(result);
    }
  };
}

function formatMatch(match: GrepMatch): string {
  if (match.path === '-') return match.lineNumber === undefined ? match.line : `${match.lineNumber}:${match.line}`;
  return `${match.path}${match.lineNumber === undefined ? '' : `:${match.lineNumber}`}:${match.line}`;
}

function childDirectoryPath(parent: string, name: string): string {
  const segment = name.endsWith('/') ? name.slice(0, -1) : name;
  return parent === '/' ? `/${segment}` : `${parent}/${segment}`;
}

function documentPathsUnder(context: ProcessContext, root: string): readonly string[] {
  const pending = [root];
  const visited = new Set<string>();
  const documents: string[] = [];
  while (pending.length > 0) {
    const path = pending.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const node = context.fs.stat(path);
    if (node?.kind === 'document') {
      documents.push(path);
      continue;
    }
    if (node?.kind !== 'directory') continue;
    const listing = context.fs.list(path);
    if (listing === undefined) continue;
    documents.push(...listing.documents.map(({ path: documentPath }) => documentPath));
    pending.push(...listing.directories.map((name) => childDirectoryPath(path, name)));
  }
  return Object.freeze([...new Set(documents)].sort());
}

function allDocumentPaths(context: ProcessContext): readonly string[] {
  return Object.freeze([...new Set(['/posts', '/pages'].flatMap((path) => documentPathsUnder(context, path)))].sort());
}

function resourcePaths(context: ProcessContext, path: string): readonly string[] | undefined {
  const node = context.fs.stat(path);
  if (node?.kind === 'document' || node?.kind === 'scratch') return Object.freeze([path]);
  if (node?.kind !== 'directory') return undefined;
  const scratchPaths = path === '/.rshell/tmp' ? context.fs.glob('/.rshell/tmp/*') : [];
  return Object.freeze([...documentPathsUnder(context, path), ...scratchPaths].sort());
}

export function executeGrep(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { options, operands } = args;
  const insensitive = options['ignore-case'] === true;
  const number = options['line-number'] === true;
  const literal = options['fixed-strings'] === true;
  const pattern = operands[0];
  if (pattern === undefined || pattern.length === 0 || pattern.length > 256 || /[\u0000-\u001f\u007f]/u.test(pattern)) return failureResult(`Usage: ${GREP_USAGE}`);
  const matcher = literal ? literalMatcher(pattern, insensitive) : compileSafeRegex(pattern, insensitive);
  if (matcher === undefined) return failureResult('grep pattern is outside the safe regular-language subset.');
  const resources = operands.slice(1);
  if (context.stdin !== undefined && resources.length > 0) return failureResult('grep accepts stdin or named public resources, not both.');

  const sourcePaths: string[] = [];
  if (context.stdin !== undefined) sourcePaths.push('-');
  else if (resources.length === 0) sourcePaths.push(...allDocumentPaths(context));
  else {
    for (const operand of resources) {
      const resolution = context.fs.resolve(operand, context.cwd, 'resource');
      if (!resolution.ok) return failureResult('grep can search only listed public documents or /.rshell/tmp scratch files.');
      const resources = resourcePaths(context, resolution.path);
      if (resources === undefined) return failureResult('grep can search only listed public documents or /.rshell/tmp scratch files.');
      sourcePaths.push(...resources);
    }
  }
  const uniqueSourcePaths = [...new Set(sourcePaths)];
  if (uniqueSourcePaths.length > maxResources) return failureResult('grep resource scope exceeds the session work limit.');
  const matches: GrepMatch[] = [];
  let outputSize = 0;
  let truncated = false;
  let scannedLines = 0;
  for (const path of uniqueSourcePaths) {
    const source = path === '-' ? context.stdin?.lines : context.fs.read(path)?.lines;
    if (source === undefined) return failureResult(`No readable rshell resource named "${path}".`);
    for (const [lineIndex, line] of source.entries()) {
      scannedLines += 1;
      if (scannedLines > maxLines) return failureResult('grep input exceeds the session work limit.');
      if (!matcher.test(line)) continue;
      const match: GrepMatch = Object.freeze({
        path,
        ...(number ? { lineNumber: lineIndex + 1 } : {}),
        line,
        ranges: Object.freeze([...matcher.ranges(line)])
      });
      const size = formatMatch(match).length;
      if (matches.length >= maxMatches || outputSize + size > maxText) { truncated = true; break; }
      matches.push(match);
      outputSize += size;
    }
    if (truncated) break;
  }
  const report: GrepReport = Object.freeze({
    pattern,
    matches: Object.freeze(matches),
    noResults: matches.length === 0,
    truncated
  });
  return successResult(matches.map(formatMatch), { value: { kind: 'grep-report', report } });
}
