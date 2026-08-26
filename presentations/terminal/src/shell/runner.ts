import type { CommandSpecRegistry } from '../commands/registry.js';
import type {
  ProcessContext,
  ProcessResult,
  ReadonlyShellAlias,
  ReadonlyShellSession,
  ShellCommandMetadata,
  ShellIdentity,
  ShellLink,
  ShellSignal,
  ShellStatePatch,
  TextStream
} from './contracts.js';
import { expandStageWords } from './expansion.js';
import { parseRshell, type RshellStage } from './parser.js';
import { failureResult, processResult, textStream } from './streams.js';
import type { ReadonlyVirtualFs } from '../vfs/contracts.js';

const maxOutputLines = 240;
const maxOutputText = 24_000;
const maxScratchFiles = 16;
const maxScratchLines = 240;
const maxScratchBytes = 12_000;

export interface ShellRunnerOptions {
  readonly stages: readonly RshellStage[];
  readonly cwd: string;
  readonly fs: ReadonlyVirtualFs;
  readonly session: ReadonlyShellSession;
  readonly clock: () => Date;
  readonly signal: ShellSignal;
  readonly registry: CommandSpecRegistry;
  readonly identity?: ShellIdentity;
  readonly friendLinks?: readonly ShellLink[];
  readonly pure?: boolean;
  readonly depth?: number;
}

interface RunnerState {
  cwd: string;
  session: ReadonlyShellSession;
  statePatch?: ShellStatePatch;
}

interface StageExecution {
  readonly command: string;
  readonly result: ProcessResult;
}

const maxAliasDepth = 16;

export function resolveSessionCommand(
  command: string,
  session: Pick<ReadonlyShellSession, 'aliases'>
): string | undefined {
  let current = command;
  const seen = new Set<string>();
  for (let depth = 0; depth < maxAliasDepth; depth += 1) {
    if (seen.has(current)) return undefined;
    seen.add(current);
    const alias = (session.aliases ?? []).find(({ name }) => name === current);
    if (alias === undefined) return current;
    current = alias.target;
  }
  return undefined;
}

function sessionAliasesFor(
  specName: string,
  registry: CommandSpecRegistry,
  session: ReadonlyShellSession
): readonly string[] {
  return (session.aliases ?? [])
    .filter((alias) => {
      const resolved = resolveSessionCommand(alias.target, session);
      return resolved !== undefined && registry.resolve(resolved)?.name === specName;
    })
    .map(({ name }) => name);
}

function commandMetadata(registry: CommandSpecRegistry, session: ReadonlyShellSession): readonly ShellCommandMetadata[] {
  return Object.freeze(registry.definitions.map((spec): ShellCommandMetadata => Object.freeze({
    name: spec.name,
    aliases: Object.freeze([...spec.aliases, ...sessionAliasesFor(spec.name, registry, session)]),
    usage: spec.usage,
    summary: spec.summary,
    group: spec.group,
    order: spec.order
  })));
}

function boundedLines(values: readonly string[]): readonly string[] {
  const result: string[] = [];
  let size = 0;
  for (const value of values) {
    const line = value.replaceAll('\u0000', '');
    if (result.length >= maxOutputLines || size + line.length > maxOutputText) {
      result.push('[rshell: output truncated]');
      break;
    }
    result.push(line);
    size += line.length;
  }
  return Object.freeze(result);
}

function boundedResult(result: ProcessResult, stderr: readonly string[] = result.stderr.lines): ProcessResult {
  return processResult(result.status, boundedLines(result.stdout.lines), boundedLines(stderr), {
    ...(result.statePatch === undefined ? {} : { statePatch: result.statePatch }),
    ...(result.controls === undefined ? {} : { controls: Object.freeze([...result.controls]) }),
    ...(result.value === undefined ? {} : { value: result.value })
  });
}

function applyStatePatch(state: RunnerState, patch: ShellStatePatch | undefined): void {
  if (patch === undefined) return;
  state.statePatch = patch;
  if (patch.kind === 'cwd') {
    state.cwd = patch.cwd;
    return;
  }
  state.session = Object.freeze({
    history: Object.freeze([...patch.session.history]),
    scratch: Object.freeze(patch.session.scratch.map((file) => Object.freeze({ name: file.name, lines: Object.freeze([...file.lines]) }))),
    ...(patch.session.aliases === undefined ? {} : {
      aliases: Object.freeze(patch.session.aliases.map((alias: ReadonlyShellAlias) => Object.freeze({ ...alias })))
    })
  });
}

function withStatePatch(result: ProcessResult, state: RunnerState, stderr: readonly string[] = result.stderr.lines): ProcessResult {
  const bounded = boundedResult(result, stderr);
  if (state.statePatch === undefined || bounded.statePatch !== undefined) return bounded;
  return processResult(bounded.status, bounded.stdout.lines, bounded.stderr.lines, {
    statePatch: state.statePatch,
    ...(bounded.controls === undefined ? {} : { controls: bounded.controls }),
    ...(bounded.value === undefined ? {} : { value: bounded.value })
  });
}

function commandFailure(message: string, state: RunnerState, stderr: readonly string[] = []): ProcessResult {
  const failure = failureResult(message);
  return withStatePatch(failure, state, [...stderr, ...failure.stderr.lines]);
}

function safeScratchName(path: string): string | undefined {
  const prefix = '/.rshell/tmp/';
  if (!path.startsWith(prefix)) return undefined;
  const name = path.slice(prefix.length);
  if (
    name.length === 0 ||
    name.includes('/') ||
    name.startsWith('.') ||
    name.normalize('NFC') !== name ||
    /[\\/?#%\u0000-\u001f\u007f]/u.test(name)
  ) return undefined;
  return name;
}

function applyRedirect(
  result: ProcessResult,
  stage: RshellStage,
  state: RunnerState,
  fs: ReadonlyVirtualFs
): ProcessResult {
  if (stage.redirect === undefined) return result;
  if (result.controls !== undefined) {
    return commandFailure('Only final text output can be redirected to rshell scratch.', state, result.stderr.lines);
  }
  const target = stage.target === undefined ? undefined : fs.resolve(stage.target, state.cwd, 'resource');
  const path = target?.ok === true ? target.path : undefined;
  const name = path === undefined ? undefined : safeScratchName(path);
  if (name === undefined) return commandFailure('Redirect only targets ~/blog/.rshell/tmp/<safe-name>.', state, result.stderr.lines);

  const existing = state.session.scratch.find((file) => file.name === name);
  if (existing === undefined && state.session.scratch.length >= maxScratchFiles) {
    return commandFailure(`Scratch is limited to ${maxScratchFiles} files.`, state, result.stderr.lines);
  }
  const output = boundedLines(result.stdout.lines);
  const written = stage.redirect === 'append' && existing !== undefined
    ? [...existing.lines, ...output]
    : [...output];
  const bytes = written.reduce((total, line) => total + line.length + 1, 0);
  if (written.length > maxScratchLines || bytes > maxScratchBytes) {
    return commandFailure('Scratch output exceeds the session file limit.', state, result.stderr.lines);
  }

  const session = Object.freeze({
    history: Object.freeze([...state.session.history]),
    scratch: Object.freeze([
      ...state.session.scratch.filter((file) => file.name !== name),
      Object.freeze({ name, lines: Object.freeze(written) })
    ].sort((left, right) => left.name.localeCompare(right.name))),
    ...(state.session.aliases === undefined ? {} : { aliases: Object.freeze([...state.session.aliases]) })
  });
  applyStatePatch(state, { kind: 'session', session });
  return processResult(0, [], result.stderr.lines, { statePatch: state.statePatch });
}

function executeStage(
  stage: RshellStage,
  state: RunnerState,
  stdin: TextStream | undefined,
  hasPipeline: boolean,
  pure: boolean,
  options: ShellRunnerOptions
): StageExecution | ProcessResult {
  const [command, ...args] = stage.words.flatMap((word) => [word.segments.map(({ value }) => value).join('')]);
  if (command === undefined) return commandFailure('A pipeline stage cannot be empty.', state);
  const resolvedCommand = resolveSessionCommand(command, state.session);
  const spec = resolvedCommand === undefined ? undefined : options.registry.resolve(resolvedCommand);
  if (spec === undefined) return commandFailure(`Unknown command: ${command}. Type "help" for commands.`, state);
  if (pure && spec.policy.substitution === 'forbidden') {
    return commandFailure(`"${command}" is not allowed in command substitution.`, state);
  }
  if (hasPipeline && spec.policy.pipeline === 'forbidden') {
    return commandFailure(`"${command}" is a standalone command and cannot be piped.`, state);
  }
  if (stage.redirect !== undefined && spec.policy.redirect === 'forbidden') {
    return commandFailure(`"${command}" does not support redirect.`, state);
  }
  const parsed = spec.parse(args);
  if (!parsed.ok) return commandFailure(parsed.message, state);

  const context: ProcessContext = Object.freeze({
    ...(stdin === undefined ? {} : { stdin }),
    cwd: state.cwd,
    fs: options.fs,
    session: state.session,
    clock: options.clock,
    signal: options.signal,
    commands: commandMetadata(options.registry, state.session),
    ...(options.identity === undefined ? {} : { identity: options.identity }),
    ...(options.friendLinks === undefined ? {} : { friendLinks: options.friendLinks })
  });
  let result: ProcessResult;
  try {
    result = spec.execute(context, parsed.arguments);
  } catch {
    return commandFailure(`Command "${command}" failed.`, state);
  }
  return { command: resolvedCommand ?? command, result: boundedResult(result) };
}

function runStages(options: ShellRunnerOptions): ProcessResult {
  const pure = options.pure ?? false;
  const depth = options.depth ?? 0;
  const state: RunnerState = { cwd: options.cwd, session: options.session };
  if (options.stages.length === 0) return commandFailure('A pipeline stage cannot be empty.', state);

  let stdin: TextStream | undefined;
  let stderr: readonly string[] = Object.freeze([]);
  let final: ProcessResult | undefined;
  for (let index = 0; index < options.stages.length; index += 1) {
    if (options.signal.aborted) return commandFailure('Command interrupted.', state, stderr);
    const stage = options.stages[index]!;
    const expanded = expandStageWords(stage.words, depth, {
      executeSubstitution: (nestedStages, nestedDepth) => {
        const nested = runStages({
          ...options,
          stages: nestedStages,
          cwd: state.cwd,
          session: state.session,
          pure: true,
          depth: nestedDepth
        });
        return { stdout: nested.stdout.lines, error: nested.status !== 0 };
      }
    });
    if (!expanded.ok) return commandFailure(expanded.message, state, stderr);

    const parsedStage: RshellStage = Object.freeze({
      ...stage,
      words: Object.freeze(expanded.words.map((value) => Object.freeze({
        segments: Object.freeze([{ value, expandSubstitution: false }])
      })))
    });
    const execution = executeStage(parsedStage, state, stdin, options.stages.length > 1, pure, options);
    if (!('command' in execution)) return execution;
    const result = execution.result;
    stderr = Object.freeze([...stderr, ...result.stderr.lines]);
    if (result.status !== 0) return withStatePatch(result, state, stderr);
    applyStatePatch(state, result.statePatch);
    const last = index === options.stages.length - 1;
    if (!last && result.controls !== undefined) {
      return commandFailure(`"${execution.command}" does not produce text for this rshell operation.`, state, stderr);
    }
    if (stage.redirect !== undefined) {
      if (!last || pure) return commandFailure('Only final text output can be redirected to rshell scratch.', state, stderr);
      const redirected = applyRedirect(result, stage, state, options.fs);
      if (redirected.status !== 0) return redirected;
      final = redirected;
      stdin = redirected.stdout;
      continue;
    }
    final = processResult(0, result.stdout.lines, stderr, {
      ...(result.controls === undefined ? {} : { controls: result.controls }),
      ...(result.value === undefined || pure ? {} : { value: result.value }),
      ...(state.statePatch === undefined ? {} : { statePatch: state.statePatch })
    });
    stdin = result.stdout;
  }
  return final === undefined ? commandFailure('A pipeline stage cannot be empty.', state, stderr) : final;
}

export function runRshell(options: ShellRunnerOptions): ProcessResult {
  return runStages(options);
}

export function runRshellInput(
  input: string,
  options: Omit<ShellRunnerOptions, 'stages'>
): ProcessResult {
  const parsed = parseRshell(input);
  if (!parsed.ok) return failureResult(parsed.message);
  return runRshell({ ...options, stages: parsed.stages });
}
