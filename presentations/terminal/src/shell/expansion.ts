import { parseRshell, readSubstitution } from './parser.js';
import type { RshellStage, RshellWord } from './parser.js';

export const RSHELL_MAX_SUBSTITUTION_DEPTH = 4;
export const RSHELL_MAX_SUBSTITUTION_OUTPUT = 2_000;

export interface RshellSubstitutionExecution {
  readonly stdout: readonly string[];
  readonly error: boolean;
}

export interface RshellExpansionDependencies {
  readonly executeSubstitution: (
    stages: readonly RshellStage[],
    depth: number
  ) => RshellSubstitutionExecution;
}

export type RshellExpansionResult =
  | { readonly ok: true; readonly words: readonly string[] }
  | { readonly ok: false; readonly message: string };

/**
 * Expands command substitutions in parser-owned words. The runner is injected
 * so this shell module stays independent from TerminalState, effects, and the
 * compatibility facade while nested execution still uses the same runner.
 */
export function expandStageWords(
  words: readonly RshellWord[],
  depth: number,
  dependencies: RshellExpansionDependencies
): RshellExpansionResult {
  if (depth > RSHELL_MAX_SUBSTITUTION_DEPTH) {
    return { ok: false, message: 'Command substitution nesting is too deep.' };
  }
  const expanded: string[] = [];
  for (const parsedWord of words) {
    let value = '';
    for (const segment of parsedWord.segments) {
      if (!segment.expandSubstitution) {
        value += segment.value;
        continue;
      }
      for (let index = 0; index < segment.value.length;) {
        if (segment.value[index] !== '$' || segment.value[index + 1] !== '(') {
          value += segment.value[index]!;
          index += 1;
          continue;
        }
        const substitution = readSubstitution(segment.value, index);
        if (substitution === undefined) return { ok: false, message: 'Unbalanced command substitution.' };
        const parsed = parseRshell(substitution.value);
        if (!parsed.ok || parsed.stages.some((stage) => stage.redirect !== undefined)) {
          return { ok: false, message: 'Command substitution accepts only pure text commands.' };
        }
        const nested = dependencies.executeSubstitution(parsed.stages, depth + 1);
        if (nested.error) return { ok: false, message: 'Command substitution did not produce text.' };
        value += nested.stdout.join(' ').trim();
        index = substitution.end;
      }
    }
    if (value.length > RSHELL_MAX_SUBSTITUTION_OUTPUT) {
      return { ok: false, message: 'Command substitution output is too large.' };
    }
    expanded.push(value);
  }
  return { ok: true, words: Object.freeze(expanded) };
}
