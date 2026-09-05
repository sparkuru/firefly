import type {
  HelpCommand,
  HelpGroup,
  ProcessContext,
  ProcessResult,
  ReadonlyShellAlias,
  ShellCommandGroup,
  ShellHelpExample,
  ShellCommandMetadata
} from '../shell/contracts.js';
import { failureResult, successResult } from '../shell/streams.js';
import type { ParsedCommandArguments } from './arguments.js';
import { completeOpen, completePath } from './completion.js';
import { noArguments, optionalPath, requiredPath, standalonePolicy, textPolicy, structuredTextPolicy } from './descriptors.js';
import type { CommandSpec } from './contracts.js';

export const OPEN_USAGE = 'open <path>';
export const VIM_USAGE = 'vim <path>';
export const OPEN_SUMMARY = 'open a listed experiment';
export const VIM_SUMMARY = 'open a public document in the reader';
export const CLEAR_USAGE = 'clear';
export const CLEAR_SUMMARY = 'clear the screen';
export const PWD_USAGE = 'pwd';
export const PWD_SUMMARY = 'print the current virtual path';
export const HELP_USAGE = 'help [command]';
export const HELP_SUMMARY = 'show this command list';
export const ABOUT_USAGE = 'about';
export const ABOUT_SUMMARY = 'describe this site';
export const WHOAMI_USAGE = 'whoami';
export const WHOAMI_SUMMARY = 'print the current user';
export const ID_USAGE = 'id';
export const ID_SUMMARY = 'show identity and read-only capabilities';
export const DATE_USAGE = 'date';
export const DATE_SUMMARY = 'print the UTC clock';
export const HISTORY_USAGE = 'history';
export const HISTORY_SUMMARY = 'show recent commands';
export const ALIAS_USAGE = 'alias [name[=command]]';
export const ALIAS_SUMMARY = 'list, query, or define session aliases';

const helpGroups: readonly ShellCommandGroup[] = Object.freeze([
  'Explore',
  'Read & navigate',
  'Identity & time',
  'Session',
  'Other'
]);

function invalidOperands(args: ParsedCommandArguments, usage: string): ProcessResult | undefined {
  const { operands } = args;
  return operands.length === 0 ? undefined : failureResult(`Usage: ${usage}`);
}

function commandLines(command: HelpCommand): string {
  const aliases = command.aliases.length === 0 ? '' : ` (${command.aliases.join(', ')})`;
  return `  ${command.usage}${aliases} — ${command.summary}`;
}

function copyExamples(command: Pick<HelpCommand, 'examples'>): readonly ShellHelpExample[] | undefined {
  return command.examples === undefined
    ? undefined
    : Object.freeze(command.examples.map((example) => Object.freeze({ ...example })));
}

function helpValue(commands: readonly ShellCommandMetadata[]): readonly HelpGroup[] {
  return Object.freeze(helpGroups.flatMap((name) => {
    const groupCommands = commands
      .filter((command) => command.group === name)
      .map((command, index) => ({ command, index }))
      .sort((left, right) => left.command.order - right.command.order || left.index - right.index)
      .map(({ command }) => Object.freeze({
        name: command.name,
        aliases: Object.freeze([...command.aliases]),
        summary: command.summary,
        usage: command.usage,
        ...(command.examples === undefined ? {} : { examples: copyExamples(command) })
      }));
    return groupCommands.length === 0
      ? []
      : [Object.freeze({ name, commands: Object.freeze(groupCommands) })];
  }));
}

function identity(context: ProcessContext): NonNullable<ProcessContext['identity']> | undefined {
  return context.identity;
}

export function formatUtcDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) throw new TypeError('The Terminal clock returned an invalid date.');
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
}

export function executeHelp(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  if (args.operands.length > 1) return failureResult(`Usage: ${HELP_USAGE}`);
  const commands = context.commands ?? Object.freeze([]);
  const groups = helpValue(commands);
  const target = args.operands[0];
  if (target !== undefined) {
    const detail = commandForToken(commands, target);
    if (detail === undefined) return failureResult(`No command named "${target}".`);
    const aliases = detail.aliases.length === 0 ? [] : [`Aliases: ${detail.aliases.join(', ')}`];
    const examples = detail.examples === undefined || detail.examples.length === 0
      ? []
      : ['Examples:', ...detail.examples.map((example) => `  ${example.command} — ${example.description}`)];
    return successResult([
      `Usage: ${detail.usage}`,
      detail.summary,
      ...aliases,
      ...examples
    ], { value: { kind: 'help', groups, detail: Object.freeze({
      name: detail.name,
      aliases: Object.freeze([...detail.aliases]),
      summary: detail.summary,
      usage: detail.usage,
      ...(detail.examples === undefined ? {} : { examples: copyExamples(detail) })
    }) } });
  }
  return successResult(groups.flatMap((group) => [group.name, ...group.commands.map(commandLines)]), { value: { kind: 'help', groups } });
}

export function executePwd(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const invalid = invalidOperands(args, PWD_USAGE);
  return invalid ?? successResult([context.cwd === '/' ? '~/blog' : `~/blog${context.cwd}`]);
}

export function executeAbout(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const invalid = invalidOperands(args, ABOUT_USAGE);
  const current = identity(context);
  return invalid ?? (current === undefined
    ? failureResult('Identity is unavailable.')
    : successResult(current.about.split(/\r?\n/u)));
}

export function executeWhoami(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const invalid = invalidOperands(args, WHOAMI_USAGE);
  const current = identity(context);
  return invalid ?? (current === undefined ? failureResult('Identity is unavailable.') : successResult([current.user]));
}

export function executeId(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const invalid = invalidOperands(args, ID_USAGE);
  const current = identity(context);
  return invalid ?? (current === undefined
    ? failureResult('Identity is unavailable.')
    : successResult([
      `uid=${current.user} gid=${current.user} groups=public-read`,
      'capabilities: read public posts/pages/lab; deny private, draft, host, network, and persistence'
    ]));
}

export function executeDate(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const invalid = invalidOperands(args, DATE_USAGE);
  return invalid ?? successResult([formatUtcDate(context.clock())]);
}

export function executeHistory(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const invalid = invalidOperands(args, HISTORY_USAGE);
  return invalid ?? successResult(context.session.history.map((item, index) => `${index + 1}  ${item}`));
}

const aliasToken = /^[a-z][a-z0-9-]*$/u;

function builtInAliases(commands: readonly ShellCommandMetadata[]): readonly ReadonlyShellAlias[] {
  return Object.freeze(commands.flatMap((command) => command.aliases.map((name) => Object.freeze({ name, target: command.name }))));
}

function allAliases(context: ProcessContext): readonly ReadonlyShellAlias[] {
  return Object.freeze([
    ...builtInAliases(context.commands ?? Object.freeze([])),
    ...(context.session.aliases ?? [])
  ]);
}

function commandForToken(commands: readonly ShellCommandMetadata[], token: string): ShellCommandMetadata | undefined {
  return commands.find((command) => command.name === token || command.aliases.includes(token));
}

function sessionWithAlias(context: ProcessContext, alias: ReadonlyShellAlias): ProcessResult {
  const aliases = [
    ...(context.session.aliases ?? []).filter(({ name }) => name !== alias.name),
    Object.freeze({ name: alias.name, target: alias.target })
  ].sort((left, right) => left.name.localeCompare(right.name));
  return successResult([`${alias.name}=${alias.target}`], {
    statePatch: {
      kind: 'session',
      session: {
        history: Object.freeze([...context.session.history]),
        scratch: Object.freeze(context.session.scratch.map((file) => Object.freeze({ name: file.name, lines: Object.freeze([...file.lines]) }))),
        aliases: Object.freeze(aliases)
      }
    }
  });
}

export function executeAlias(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  if (operands.length > 1) return failureResult(`Usage: ${ALIAS_USAGE}`);
  const commands = context.commands ?? Object.freeze([]);
  const aliases = allAliases(context);
  const operand = operands[0];
  if (operand === undefined) return successResult(aliases.map(({ name, target }) => `${name}=${target}`));

  const separator = operand.indexOf('=');
  if (separator !== -1) {
    const name = operand.slice(0, separator);
    const target = operand.slice(separator + 1);
    if (!aliasToken.test(name) || !aliasToken.test(target)) return failureResult(`Usage: ${ALIAS_USAGE}`);
    if (commandForToken(commands, name) !== undefined) return failureResult(`Cannot redefine built-in command or alias "${name}".`);
    if (commandForToken(commands, target) === undefined) {
      return failureResult(`No command named "${target}".`);
    }
    return sessionWithAlias(context, { name, target });
  }

  const match = aliases.find(({ name }) => name === operand);
  return match === undefined
    ? failureResult(`No alias named "${operand}".`)
    : successResult([`${match.name}=${match.target}`]);
}

export function executeOpen(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  if (operands.length !== 1) return failureResult(`Usage: ${OPEN_USAGE}`);
  const resolution = context.fs.resolve(operands[0]!, context.cwd, 'resource');
  const node = resolution.ok ? context.fs.stat(resolution.path) : undefined;
  if (node?.kind !== 'experiment') return failureResult(`No listed experiment named "${operands[0]}". Try "ls".`);
  return successResult([], { controls: [{ kind: 'open-experiment', id: node.experiment.id }] });
}

export function executeVim(context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  if (operands.length !== 1) return failureResult(`Usage: ${VIM_USAGE}`);
  const resolution = context.fs.resolve(operands[0]!, context.cwd, 'resource');
  const node = resolution.ok ? context.fs.stat(resolution.path) : undefined;
  if (node?.kind !== 'document') {
    return failureResult(`No public document named "${operands[0]}". Try "tree" or "tree ~/blog".`);
  }
  return successResult([], { controls: [{ kind: 'open-document', path: node.document.path }] });
}

export function executeClear(_context: ProcessContext, args: ParsedCommandArguments): ProcessResult {
  const { operands } = args;
  return operands.length === 0
    ? successResult([], { controls: [{ kind: 'clear-transcript' }] })
    : failureResult(`Usage: ${CLEAR_USAGE}`);
}

export const OPEN_COMMAND_SPEC: CommandSpec = {
  name: 'open',
  aliases: Object.freeze([]),
  usage: OPEN_USAGE,
  summary: OPEN_SUMMARY,
  group: 'Read & navigate',
  order: 30,
  policy: standalonePolicy,
  parse: requiredPath(OPEN_USAGE),
  execute: executeOpen,
  complete: completeOpen
};

export const VIM_COMMAND_SPEC: CommandSpec = {
  name: 'vim',
  aliases: Object.freeze([]),
  usage: VIM_USAGE,
  summary: VIM_SUMMARY,
  group: 'Read & navigate',
  order: 20,
  policy: standalonePolicy,
  parse: requiredPath(VIM_USAGE),
  execute: executeVim,
  complete: completePath
};

export const CLEAR_COMMAND_SPEC: CommandSpec = {
  name: 'clear',
  aliases: Object.freeze(['cls']),
  usage: CLEAR_USAGE,
  summary: CLEAR_SUMMARY,
  group: 'Session',
  order: 40,
  policy: standalonePolicy,
  parse: noArguments(CLEAR_USAGE),
  execute: executeClear
};

export const PWD_COMMAND_SPEC: CommandSpec = {
  name: 'pwd',
  aliases: Object.freeze([]),
  usage: PWD_USAGE,
  summary: PWD_SUMMARY,
  group: 'Read & navigate',
  order: 50,
  policy: textPolicy,
  parse: noArguments(PWD_USAGE),
  execute: executePwd
};

export const HELP_COMMAND_SPEC: CommandSpec = {
  name: 'help',
  aliases: Object.freeze(['?']),
  usage: HELP_USAGE,
  summary: HELP_SUMMARY,
  group: 'Session',
  order: 10,
  policy: structuredTextPolicy,
  parse: optionalPath(HELP_USAGE),
  execute: executeHelp
};

export const ABOUT_COMMAND_SPEC: CommandSpec = {
  name: 'about',
  aliases: Object.freeze([]),
  usage: ABOUT_USAGE,
  summary: ABOUT_SUMMARY,
  group: 'Identity & time',
  order: 10,
  policy: textPolicy,
  parse: noArguments(ABOUT_USAGE),
  execute: executeAbout
};

export const WHOAMI_COMMAND_SPEC: CommandSpec = {
  name: 'whoami',
  aliases: Object.freeze([]),
  usage: WHOAMI_USAGE,
  summary: WHOAMI_SUMMARY,
  group: 'Identity & time',
  order: 20,
  policy: textPolicy,
  parse: noArguments(WHOAMI_USAGE),
  execute: executeWhoami
};

export const ID_COMMAND_SPEC: CommandSpec = {
  name: 'id',
  aliases: Object.freeze([]),
  usage: ID_USAGE,
  summary: ID_SUMMARY,
  group: 'Identity & time',
  order: 30,
  policy: textPolicy,
  parse: noArguments(ID_USAGE),
  execute: executeId
};

export const DATE_COMMAND_SPEC: CommandSpec = {
  name: 'date',
  aliases: Object.freeze([]),
  usage: DATE_USAGE,
  summary: DATE_SUMMARY,
  group: 'Identity & time',
  order: 40,
  policy: textPolicy,
  parse: noArguments(DATE_USAGE),
  execute: executeDate
};

export const HISTORY_COMMAND_SPEC: CommandSpec = {
  name: 'history',
  aliases: Object.freeze([]),
  usage: HISTORY_USAGE,
  summary: HISTORY_SUMMARY,
  group: 'Session',
  order: 20,
  policy: textPolicy,
  parse: noArguments(HISTORY_USAGE),
  execute: executeHistory
};

export const ALIAS_COMMAND_SPEC: CommandSpec = {
  name: 'alias',
  aliases: Object.freeze([]),
  usage: ALIAS_USAGE,
  summary: ALIAS_SUMMARY,
  group: 'Session',
  order: 30,
  policy: textPolicy,
  parse: optionalPath(ALIAS_USAGE),
  execute: executeAlias
};
