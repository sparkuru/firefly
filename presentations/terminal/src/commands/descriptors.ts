import { createCommandArgumentParser } from './arguments.js';
import type { CommandArgumentParser } from './arguments.js';
import type { CommandPolicy } from './contracts.js';

export const textPolicy: CommandPolicy = Object.freeze({
  pipeline: 'text',
  substitution: 'allowed',
  redirect: 'text'
});

export const structuredTextPolicy: CommandPolicy = Object.freeze({
  pipeline: 'text',
  substitution: 'allowed',
  redirect: 'forbidden'
});

export const standalonePolicy: CommandPolicy = Object.freeze({
  pipeline: 'forbidden',
  substitution: 'forbidden',
  redirect: 'forbidden'
});

export function noArguments(usage: string): CommandArgumentParser {
  return createCommandArgumentParser({ usage, maxOperands: 0 });
}

export function optionalPath(usage: string): CommandArgumentParser {
  return createCommandArgumentParser({ usage, maxOperands: 1 });
}

export function requiredPath(usage: string): CommandArgumentParser {
  return createCommandArgumentParser({ usage, minOperands: 1, maxOperands: 1 });
}
