import { CAT_COMMAND_SPEC } from './cat.js';
import { CD_COMMAND_SPEC } from './cd.js';
import { FIND_COMMAND_SPEC } from './find.js';
import { GREP_COMMAND_SPEC } from './grep.js';
import { FRIENDS_COMMAND_SPEC } from './links.js';
import { LS_COMMAND_SPEC } from './ls.js';
import {
  ABOUT_COMMAND_SPEC,
  ALIAS_COMMAND_SPEC,
  CLEAR_COMMAND_SPEC,
  DATE_COMMAND_SPEC,
  HELP_COMMAND_SPEC,
  HISTORY_COMMAND_SPEC,
  ID_COMMAND_SPEC,
  OPEN_COMMAND_SPEC,
  PWD_COMMAND_SPEC,
  VIM_COMMAND_SPEC,
  WHOAMI_COMMAND_SPEC
} from './session.js';
import { TREE_COMMAND_SPEC } from './tree.js';
import type { CommandSpec } from './contracts.js';

const commandToken = /^[a-z][a-z0-9-]*$/u;
const groups = new Set(['Explore', 'Read & navigate', 'Identity & time', 'Session', 'Other']);

function safeMetadata(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value);
}

function safeExamples(examples: unknown): examples is CommandSpec['examples'] {
  if (examples === undefined) return true;
  if (!Array.isArray(examples) || Object.getPrototypeOf(examples) !== Array.prototype) return false;
  const allowed = new Set<PropertyKey>(['length']);
  for (let index = 0; index < examples.length; index += 1) {
    const key = String(index);
    if (!Object.prototype.hasOwnProperty.call(examples, key)) return false;
    allowed.add(key);
  }
  if (Reflect.ownKeys(examples).some((key) => !allowed.has(key))) return false;
  return examples.every((example) => {
    if (
      typeof example !== 'object' ||
      example === null ||
      (Object.getPrototypeOf(example) !== Object.prototype && Object.getPrototypeOf(example) !== null)
    ) return false;
    const descriptors = Object.getOwnPropertyDescriptors(example);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 2 || !descriptors.command || !descriptors.description || keys.some((key) => key !== 'command' && key !== 'description')) return false;
    const command = descriptors.command;
    const description = descriptors.description;
    return 'value' in command && !('get' in command) && !('set' in command) &&
      'value' in description && !('get' in description) && !('set' in description) &&
      safeMetadata(command.value) && safeMetadata(description.value);
  });
}

const coreCommandSpecs: readonly CommandSpec[] = Object.freeze([
  LS_COMMAND_SPEC,
  GREP_COMMAND_SPEC,
  FIND_COMMAND_SPEC,
  CAT_COMMAND_SPEC,
  VIM_COMMAND_SPEC,
  OPEN_COMMAND_SPEC,
  CD_COMMAND_SPEC,
  CLEAR_COMMAND_SPEC
]);

const sessionCommandSpecs: readonly CommandSpec[] = Object.freeze([
  TREE_COMMAND_SPEC,
  FRIENDS_COMMAND_SPEC,
  PWD_COMMAND_SPEC,
  HELP_COMMAND_SPEC,
  ABOUT_COMMAND_SPEC,
  WHOAMI_COMMAND_SPEC,
  ID_COMMAND_SPEC,
  DATE_COMMAND_SPEC,
  HISTORY_COMMAND_SPEC,
  ALIAS_COMMAND_SPEC
]);

function validateSpecs(specs: readonly CommandSpec[]): readonly CommandSpec[] {
  const tokens = new Set<string>();
  for (const spec of specs) {
    if (!commandToken.test(spec.name) || !Array.isArray(spec.aliases) || spec.aliases.some((alias) => alias !== '?' && !commandToken.test(alias)) ||
      !safeMetadata(spec.summary) || !safeMetadata(spec.usage) || !safeExamples(spec.examples) ||
      (spec.usage !== spec.name && !spec.usage.startsWith(`${spec.name} `)) ||
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
    policy: Object.freeze({ ...spec.policy }),
    ...(spec.examples === undefined ? {} : {
      examples: Object.freeze(spec.examples.map((example) => Object.freeze({
        command: example.command,
        description: example.description
      })))
    })
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
