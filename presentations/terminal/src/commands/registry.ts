import { CAT_SUMMARY, CAT_USAGE, executeCat } from './cat.js';
import { CD_SUMMARY, CD_USAGE, executeCd } from './cd.js';
import { GREP_SUMMARY, GREP_USAGE, executeGrep } from './grep.js';
import { LS_SUMMARY, LS_USAGE, executeLs } from './ls.js';
import { TREE_SUMMARY, TREE_USAGE, executeTree } from './tree.js';
import {
  ABOUT_SUMMARY,
  ABOUT_USAGE,
  ALIAS_SUMMARY,
  ALIAS_USAGE,
  CLEAR_SUMMARY,
  CLEAR_USAGE,
  DATE_SUMMARY,
  DATE_USAGE,
  executeAbout,
  executeAlias,
  executeClear,
  executeDate,
  executeHelp,
  executeHistory,
  executeId,
  executeOpen,
  executePwd,
  executeVim,
  executeWhoami,
  HELP_SUMMARY,
  HELP_USAGE,
  HISTORY_SUMMARY,
  HISTORY_USAGE,
  ID_SUMMARY,
  ID_USAGE,
  OPEN_SUMMARY,
  OPEN_USAGE,
  PWD_SUMMARY,
  PWD_USAGE,
  VIM_SUMMARY,
  VIM_USAGE,
  WHOAMI_SUMMARY,
  WHOAMI_USAGE
} from './session.js';
import { createCommandArgumentParser } from './arguments.js';
import type { CommandSpec } from './contracts.js';

const textPolicy = Object.freeze({ pipeline: 'text' as const, substitution: 'allowed' as const, redirect: 'text' as const });
const structuredTextPolicy = Object.freeze({ pipeline: 'text' as const, substitution: 'allowed' as const, redirect: 'forbidden' as const });
const standalonePolicy = Object.freeze({ pipeline: 'forbidden' as const, substitution: 'forbidden' as const, redirect: 'forbidden' as const });
const commandToken = /^[a-z][a-z0-9-]*$/u;
const groups = new Set(['Explore', 'Read & navigate', 'Identity & time', 'Session', 'Other']);

function safeMetadata(value: string): boolean {
  return value.length > 0 && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value);
}

const noArguments = (usage: string) => createCommandArgumentParser({ usage, maxOperands: 0 });
const optionalPath = (usage: string) => createCommandArgumentParser({ usage, maxOperands: 1 });
const requiredPath = (usage: string) => createCommandArgumentParser({ usage, minOperands: 1, maxOperands: 1 });
const lsArguments = createCommandArgumentParser({
  usage: LS_USAGE,
  maxOperands: 1,
  options: [{ name: 'help', aliases: ['-h', '--help'] }]
});
const grepArguments = createCommandArgumentParser({
  usage: GREP_USAGE,
  minOperands: 1,
  maxOperands: 257,
  options: [
    { name: 'ignore-case', aliases: ['-i', '--ignore-case'] },
    { name: 'line-number', aliases: ['-n', '--line-number'] },
    { name: 'fixed-strings', aliases: ['-F', '--fixed-strings'] }
  ]
});

const coreCommandSpecs: readonly CommandSpec[] = Object.freeze([
  {
    name: 'ls', aliases: Object.freeze(['l', 'll']), usage: LS_USAGE, summary: LS_SUMMARY,
    group: 'Explore', order: 10, policy: textPolicy, parse: lsArguments, execute: executeLs
  },
  {
    name: 'grep', aliases: Object.freeze([]), usage: GREP_USAGE, summary: GREP_SUMMARY,
    group: 'Explore', order: 30, policy: textPolicy, parse: grepArguments, execute: executeGrep
  },
  {
    name: 'cat', aliases: Object.freeze([]), usage: CAT_USAGE, summary: CAT_SUMMARY,
    group: 'Read & navigate', order: 10, policy: textPolicy, parse: optionalPath(CAT_USAGE), execute: executeCat
  },
  {
    name: 'vim', aliases: Object.freeze([]), usage: VIM_USAGE, summary: VIM_SUMMARY,
    group: 'Read & navigate', order: 20, policy: standalonePolicy, parse: requiredPath(VIM_USAGE), execute: executeVim
  },
  {
    name: 'open', aliases: Object.freeze([]), usage: OPEN_USAGE, summary: OPEN_SUMMARY,
    group: 'Read & navigate', order: 30, policy: standalonePolicy, parse: requiredPath(OPEN_USAGE), execute: executeOpen
  },
  {
    name: 'cd', aliases: Object.freeze([]), usage: CD_USAGE, summary: CD_SUMMARY,
    group: 'Read & navigate', order: 40, policy: standalonePolicy, parse: optionalPath(CD_USAGE), execute: executeCd
  },
  {
    name: 'clear', aliases: Object.freeze(['cls']), usage: CLEAR_USAGE, summary: CLEAR_SUMMARY,
    group: 'Session', order: 40, policy: standalonePolicy, parse: noArguments(CLEAR_USAGE), execute: executeClear
  }
]);

const sessionCommandSpecs: readonly CommandSpec[] = Object.freeze([
  {
    name: 'tree', aliases: Object.freeze([]), usage: TREE_USAGE, summary: TREE_SUMMARY,
    group: 'Explore', order: 20, policy: structuredTextPolicy, parse: optionalPath(TREE_USAGE), execute: executeTree
  },
  {
    name: 'pwd', aliases: Object.freeze([]), usage: PWD_USAGE, summary: PWD_SUMMARY,
    group: 'Read & navigate', order: 50, policy: textPolicy, parse: noArguments(PWD_USAGE), execute: executePwd
  },
  {
    name: 'help', aliases: Object.freeze(['?']), usage: HELP_USAGE, summary: HELP_SUMMARY,
    group: 'Session', order: 10, policy: structuredTextPolicy, parse: noArguments(HELP_USAGE), execute: executeHelp
  },
  {
    name: 'about', aliases: Object.freeze([]), usage: ABOUT_USAGE, summary: ABOUT_SUMMARY,
    group: 'Identity & time', order: 10, policy: textPolicy, parse: noArguments(ABOUT_USAGE), execute: executeAbout
  },
  {
    name: 'whoami', aliases: Object.freeze([]), usage: WHOAMI_USAGE, summary: WHOAMI_SUMMARY,
    group: 'Identity & time', order: 20, policy: textPolicy, parse: noArguments(WHOAMI_USAGE), execute: executeWhoami
  },
  {
    name: 'id', aliases: Object.freeze([]), usage: ID_USAGE, summary: ID_SUMMARY,
    group: 'Identity & time', order: 30, policy: textPolicy, parse: noArguments(ID_USAGE), execute: executeId
  },
  {
    name: 'date', aliases: Object.freeze([]), usage: DATE_USAGE, summary: DATE_SUMMARY,
    group: 'Identity & time', order: 40, policy: textPolicy, parse: noArguments(DATE_USAGE), execute: executeDate
  },
  {
    name: 'history', aliases: Object.freeze([]), usage: HISTORY_USAGE, summary: HISTORY_SUMMARY,
    group: 'Session', order: 20, policy: textPolicy, parse: noArguments(HISTORY_USAGE), execute: executeHistory
  },
  {
    name: 'alias', aliases: Object.freeze([]), usage: ALIAS_USAGE, summary: ALIAS_SUMMARY,
    group: 'Session', order: 30, policy: textPolicy, parse: optionalPath(ALIAS_USAGE), execute: executeAlias
  }
]);

function validateSpecs(specs: readonly CommandSpec[]): readonly CommandSpec[] {
  const tokens = new Set<string>();
  for (const spec of specs) {
    if (!commandToken.test(spec.name) || spec.aliases.some((alias) => alias !== '?' && !commandToken.test(alias)) ||
      !safeMetadata(spec.summary) || !safeMetadata(spec.usage) || (spec.usage !== spec.name && !spec.usage.startsWith(`${spec.name} `)) ||
      !groups.has(spec.group) || !Number.isSafeInteger(spec.order) || spec.order < 0 ||
      (spec.policy.pipeline !== 'text' && spec.policy.pipeline !== 'forbidden') ||
      (spec.policy.substitution !== 'allowed' && spec.policy.substitution !== 'forbidden') ||
      (spec.policy.redirect !== 'text' && spec.policy.redirect !== 'forbidden') ||
      typeof spec.parse !== 'function' ||
      typeof spec.execute !== 'function' || (spec.complete !== undefined && typeof spec.complete !== 'function')) {
      throw new TypeError('Command specs must have safe metadata, policy, and handlers.');
    }
    for (const token of [spec.name, ...spec.aliases]) {
      if (tokens.has(token)) throw new TypeError(`Command token collision: ${token}`);
      tokens.add(token);
    }
  }
  return Object.freeze(specs.map((spec) => Object.freeze({
    ...spec,
    aliases: Object.freeze([...spec.aliases]),
    policy: Object.freeze({ ...spec.policy })
  })));
}

export const CORE_COMMAND_SPECS = validateSpecs(coreCommandSpecs);
export const SESSION_COMMAND_SPECS = validateSpecs(sessionCommandSpecs);
export const NEUTRAL_COMMAND_SPECS = validateSpecs([...coreCommandSpecs, ...sessionCommandSpecs]);

export interface CommandSpecRegistry {
  readonly definitions: readonly CommandSpec[];
  readonly resolve: (name: string) => CommandSpec | undefined;
}

export function createCommandSpecRegistry(specs: readonly CommandSpec[] = CORE_COMMAND_SPECS): CommandSpecRegistry {
  const definitions = validateSpecs(specs);
  const lookup = new Map(definitions.flatMap((spec) => [spec.name, ...spec.aliases].map((token) => [token, spec] as const)));
  return Object.freeze({ definitions, resolve: (name: string) => lookup.get(name) });
}

export const CORE_COMMAND_REGISTRY = createCommandSpecRegistry();
export const NEUTRAL_COMMAND_REGISTRY = createCommandSpecRegistry(NEUTRAL_COMMAND_SPECS);
