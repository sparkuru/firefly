import type { ProcessContext, ProcessResult, ShellHelpExample } from '../shell/contracts.js';
import type { CommandArgumentParser, ParsedCommandArguments } from './arguments.js';

export type CommandGroup =
  | 'Explore'
  | 'Read & navigate'
  | 'Identity & time'
  | 'Session'
  | 'Other';

export type CompletionResult =
  | { readonly kind: 'unique'; readonly value: string; readonly candidates: readonly string[] }
  | {
    readonly kind: 'ambiguous';
    readonly value: string;
    readonly candidates: readonly string[];
    readonly candidateValues: readonly string[];
    readonly ownsTab: boolean;
  }
  | { readonly kind: 'no-match'; readonly candidates: readonly []; readonly ownsTab: true }
  | { readonly kind: 'none'; readonly candidates: readonly [] };

export interface CommandPolicy {
  readonly pipeline: 'text' | 'forbidden';
  readonly substitution: 'allowed' | 'forbidden';
  readonly redirect: 'text' | 'forbidden';
}

export interface CompletionContext {
  readonly cwd: string;
  readonly fs: import('../vfs/contracts.js').ReadonlyVirtualFs;
  readonly invokedName: string;
}

export interface CommandSpec {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly usage: string;
  readonly summary: string;
  readonly group: CommandGroup;
  readonly order: number;
  readonly policy: CommandPolicy;
  readonly parse: CommandArgumentParser;
  readonly execute: (context: ProcessContext, args: ParsedCommandArguments) => ProcessResult;
  readonly examples?: readonly ShellHelpExample[];
  readonly complete?: (context: CompletionContext, operand: string) => CompletionResult;
}
