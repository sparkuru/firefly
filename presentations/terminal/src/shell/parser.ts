export interface RshellWordSegment {
  readonly value: string;
  readonly expandSubstitution: boolean;
}

export interface RshellWord {
  readonly segments: readonly RshellWordSegment[];
}

export interface RshellStage {
  readonly words: readonly RshellWord[];
  readonly redirect?: 'replace' | 'append';
  readonly target?: string;
}

export interface RshellParseSuccess {
  readonly ok: true;
  readonly stages: readonly RshellStage[];
}

export interface RshellParseFailure {
  readonly ok: false;
  readonly message: string;
}

export type RshellParseResult = RshellParseSuccess | RshellParseFailure;

export interface RshellSubstitution {
  readonly end: number;
  readonly value: string;
}

export const RSHELL_MAX_INPUT_LENGTH = 8_000;
export const RSHELL_MAX_STAGES = 8;

/**
 * Finds the closing parenthesis for a command substitution that starts at
 * `start`. Nested substitutions are balanced, while quoted text keeps its
 * parentheses literal for the bounded rshell grammar.
 */
export function readSubstitution(source: string, start: number): RshellSubstitution | undefined {
  let depth = 1;
  let quote: "'" | '"' | null = null;
  for (let index = start + 2; index < source.length; index += 1) {
    const character = source[index]!;
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '$' && source[index + 1] === '(') {
      depth += 1;
      index += 1;
      continue;
    }
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return { end: index + 1, value: source.slice(start + 2, index) };
    }
  }
  return undefined;
}

/**
 * Parses the bounded quote-aware rshell grammar used by terminal execution.
 * The returned AST keeps substitution eligibility on each word segment so
 * single-quoted text remains literal during the later expansion phase.
 */
export function parseRshell(input: string): RshellParseResult {
  if (input.length > RSHELL_MAX_INPUT_LENGTH) {
    return { ok: false, message: `Command input is limited to ${RSHELL_MAX_INPUT_LENGTH} characters.` };
  }
  const stages: RshellStage[] = [];
  let words: RshellWord[] = [];
  let segments: RshellWordSegment[] = [];
  let word = '';
  let wordExpands = true;
  let started = false;
  let quote: "'" | '"' | null = null;
  let redirect: 'replace' | 'append' | undefined;
  let target: string | undefined;

  const append = (value: string, expandSubstitution: boolean): void => {
    if (word.length > 0 && wordExpands !== expandSubstitution) {
      segments.push(Object.freeze({ value: word, expandSubstitution: wordExpands }));
      word = '';
    }
    wordExpands = expandSubstitution;
    word += value;
  };

  const flush = (): string | undefined => {
    if (!started) return undefined;
    if (word.length > 0) {
      segments.push(Object.freeze({ value: word, expandSubstitution: wordExpands }));
    }
    const value = segments.map(({ value: segment }) => segment).join('');
    const parsedWord = Object.freeze({ segments: Object.freeze([...segments]) });
    segments = [];
    word = '';
    wordExpands = true;
    started = false;
    if (redirect !== undefined && target === undefined) target = value;
    else if (redirect !== undefined) return 'A redirect accepts exactly one target.';
    else words.push(parsedWord);
    return undefined;
  };

  const finishStage = (): string | undefined => {
    const failure = flush();
    if (failure !== undefined) return failure;
    if (words.length === 0) return 'A pipeline stage cannot be empty.';
    if (redirect !== undefined && target === undefined) return 'A redirect needs a scratch target.';
    stages.push(Object.freeze({ words: Object.freeze(words), ...(redirect ? { redirect, target } : {}) }));
    words = [];
    redirect = undefined;
    target = undefined;
    return undefined;
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quote === "'") {
      if (character === quote) {
        if (word.length > 0) {
          segments.push(Object.freeze({ value: word, expandSubstitution: false }));
          word = '';
        }
        quote = null;
        wordExpands = true;
      } else append(character, false);
      started = true;
      continue;
    }
    if (quote === '"') {
      if (character === quote) {
        if (word.length > 0) {
          segments.push(Object.freeze({ value: word, expandSubstitution: true }));
          word = '';
        }
        quote = null;
      } else if (character === '$' && input[index + 1] === '(') {
        const substitution = readSubstitution(input, index);
        if (substitution === undefined) return { ok: false, message: 'Unbalanced command substitution. Close $(...) and try again.' };
        append(input.slice(index, substitution.end), true);
        index = substitution.end - 1;
      } else {
        append(character, true);
      }
      started = true;
      continue;
    }
    if (character === "'" || character === '"') {
      if (word.length > 0) {
        segments.push(Object.freeze({ value: word, expandSubstitution: true }));
        word = '';
      }
      quote = character;
      wordExpands = character === '"';
      started = true;
      continue;
    }
    if (character === '$' && input[index + 1] === '(') {
      const substitution = readSubstitution(input, index);
      if (substitution === undefined) return { ok: false, message: 'Unbalanced command substitution. Close $(...) and try again.' };
      append(input.slice(index, substitution.end), true);
      started = true;
      index = substitution.end - 1;
      continue;
    }
    if (/\s/u.test(character)) {
      const failure = flush();
      if (failure !== undefined) return { ok: false, message: failure };
      continue;
    }
    if (character === '|') {
      if (redirect !== undefined) return { ok: false, message: 'Redirection is allowed only on the final pipeline stage.' };
      const failure = finishStage();
      if (failure !== undefined) return { ok: false, message: failure };
      continue;
    }
    if (character === '>') {
      const failure = flush();
      if (failure !== undefined) return { ok: false, message: failure };
      if (words.length === 0 || redirect !== undefined) return { ok: false, message: 'Redirection follows a command and has one target.' };
      redirect = input[index + 1] === '>' ? 'append' : 'replace';
      if (redirect === 'append') index += 1;
      continue;
    }
    append(character, true);
    started = true;
  }
  if (quote !== null) return { ok: false, message: 'Unbalanced quote. Close the quote and try again.' };
  const failure = finishStage();
  if (failure !== undefined) return { ok: false, message: failure };
  if (stages.length > RSHELL_MAX_STAGES) return { ok: false, message: `At most ${RSHELL_MAX_STAGES} pipeline stages are allowed.` };
  return { ok: true, stages: Object.freeze(stages) };
}
