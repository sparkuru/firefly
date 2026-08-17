export type CommandOptionValue = true | string;

export interface ParsedCommandArguments {
  readonly options: Readonly<Record<string, CommandOptionValue>>;
  readonly operands: readonly string[];
}

export interface CommandOptionDefinition {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly value?: 'none' | 'required';
}

export interface CommandArgumentDefinition {
  readonly usage: string;
  readonly options?: readonly CommandOptionDefinition[];
  readonly minOperands?: number;
  readonly maxOperands?: number;
}

export type CommandArgumentResult =
  | { readonly ok: true; readonly arguments: ParsedCommandArguments }
  | { readonly ok: false; readonly message: string };

export type CommandArgumentParser = (argv: readonly string[]) => CommandArgumentResult;

const optionNamePattern = /^[a-z][a-z0-9-]*$/u;
const shortOptionPattern = /^-[A-Za-z]$/u;
const longOptionPattern = /^--[a-z][a-z0-9-]*$/u;

function argumentFailure(definition: CommandArgumentDefinition, detail: string): CommandArgumentResult {
  return { ok: false, message: `${detail} Usage: ${definition.usage}` };
}

function optionValue(
  options: Readonly<Record<string, CommandOptionValue>>,
  name: string,
  value: CommandOptionValue
): Readonly<Record<string, CommandOptionValue>> {
  return Object.freeze({ ...options, [name]: value });
}

function optionTokenIsSafe(token: string): boolean {
  return shortOptionPattern.test(token) || longOptionPattern.test(token);
}

function validateDefinition(definition: CommandArgumentDefinition): void {
  if (definition.usage.length === 0 || definition.usage !== definition.usage.trim()) {
    throw new TypeError('Command argument usage must be non-empty and trimmed.');
  }
  if (definition.minOperands !== undefined && (!Number.isSafeInteger(definition.minOperands) || definition.minOperands < 0)) {
    throw new TypeError('Command argument minimum must be a non-negative safe integer.');
  }
  if (definition.maxOperands !== undefined && (!Number.isSafeInteger(definition.maxOperands) || definition.maxOperands < 0)) {
    throw new TypeError('Command argument maximum must be a non-negative safe integer.');
  }
  if (definition.minOperands !== undefined && definition.maxOperands !== undefined && definition.minOperands > definition.maxOperands) {
    throw new TypeError('Command argument minimum cannot exceed its maximum.');
  }

  const tokens = new Set<string>();
  for (const option of definition.options ?? []) {
    if (!optionNamePattern.test(option.name) || option.aliases.length === 0 ||
      (option.value !== undefined && option.value !== 'none' && option.value !== 'required')) {
      throw new TypeError('Command options must have safe names and value policies.');
    }
    for (const token of option.aliases) {
      if (!optionTokenIsSafe(token) || tokens.has(token)) throw new TypeError(`Command option collision: ${token}`);
      tokens.add(token);
    }
  }
}

function readOption(
  token: string,
  lookup: ReadonlyMap<string, CommandOptionDefinition>
): { readonly definition: CommandOptionDefinition; readonly attachedValue?: string } | undefined {
  if (token.startsWith('--') && token.includes('=')) {
    const separator = token.indexOf('=');
    const name = token.slice(0, separator);
    const definition = lookup.get(name);
    return definition === undefined ? undefined : { definition, attachedValue: token.slice(separator + 1) };
  }
  const exact = lookup.get(token);
  if (exact !== undefined) return { definition: exact };
  return undefined;
}

/**
 * Builds the bounded argv parser owned by one neutral command definition.
 * Options are intentionally permuted around operands, matching the useful
 * POSIX/GNU shell habit of accepting `command value --flag` as well as
 * `command --flag value`. The parser never interprets pipes or quoting; the
 * authoritative rshell parser has already produced argv by this point.
 */
export function createCommandArgumentParser(definition: CommandArgumentDefinition): CommandArgumentParser {
  validateDefinition(definition);
  const lookup = new Map<string, CommandOptionDefinition>();
  for (const option of definition.options ?? []) {
    for (const token of option.aliases) lookup.set(token, option);
  }
  const frozenLookup = new Map(lookup);

  return (argv: readonly string[]): CommandArgumentResult => {
    const operands: string[] = [];
    let options: Readonly<Record<string, CommandOptionValue>> = Object.freeze({});
    let endOptions = false;

    for (let index = 0; index < argv.length; index += 1) {
      const token = argv[index]!;
      if (endOptions || token === '-' || !token.startsWith('-')) {
        operands.push(token);
        continue;
      }
      if (token === '--') {
        endOptions = true;
        continue;
      }

      const exact = readOption(token, frozenLookup);
      if (exact !== undefined) {
        const { definition: option, attachedValue } = exact;
        if (option.value !== 'required' && attachedValue !== undefined) {
          return argumentFailure(definition, `Option "${token.slice(0, token.indexOf('='))}" does not accept a value.`);
        }
        let value: CommandOptionValue = true;
        if (option.value === 'required') {
          if (attachedValue !== undefined) value = attachedValue;
          else {
            const next = argv[index + 1];
            if (next === undefined) return argumentFailure(definition, `Option "${token}" requires a value.`);
            index += 1;
            value = next;
          }
        }
        options = optionValue(options, option.name, value);
        continue;
      }

      if (token.startsWith('--')) {
        return argumentFailure(definition, `Unknown option "${token}".`);
      }

      let clusterIndex = 1;
      let clusterOptions = options;
      while (clusterIndex < token.length) {
        const shortToken = `-${token[clusterIndex]!}`;
        const option = frozenLookup.get(shortToken);
        if (option === undefined) return argumentFailure(definition, `Unknown option "${shortToken}".`);
        if (option.value === 'required') {
          const attached = token.slice(clusterIndex + 1);
          const next = attached.length > 0 ? attached : argv[index + 1];
          if (next === undefined) return argumentFailure(definition, `Option "${shortToken}" requires a value.`);
          if (attached.length === 0) index += 1;
          clusterOptions = optionValue(clusterOptions, option.name, next);
          clusterIndex = token.length;
          continue;
        }
        clusterOptions = optionValue(clusterOptions, option.name, true);
        clusterIndex += 1;
      }
      options = clusterOptions;
    }

    if (definition.minOperands !== undefined && operands.length < definition.minOperands) {
      return argumentFailure(definition, 'Not enough operands.');
    }
    if (definition.maxOperands !== undefined && operands.length > definition.maxOperands) {
      return argumentFailure(definition, 'Too many operands.');
    }
    return { ok: true, arguments: Object.freeze({ options, operands: Object.freeze(operands) }) };
  };
}

export function commandArguments(operands: readonly string[] = [], options: Readonly<Record<string, CommandOptionValue>> = {}): ParsedCommandArguments {
  return Object.freeze({ options: Object.freeze({ ...options }), operands: Object.freeze([...operands]) });
}
