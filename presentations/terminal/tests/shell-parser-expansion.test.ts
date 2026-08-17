import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseRshell,
  RSHELL_MAX_INPUT_LENGTH,
  RSHELL_MAX_STAGES
} from '../src/shell/parser.js';
import {
  expandStageWords,
  RSHELL_MAX_SUBSTITUTION_DEPTH
} from '../src/shell/expansion.js';

test('parseRshell exposes a frozen quote-aware pipeline AST', () => {
  const parsed = parseRshell(`cat '$(literal)' | grep -nF "a" >> /.rshell/tmp/matches`);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.stages.length, 2);
  assert.equal(parsed.stages[0]?.words[1]?.segments[0]?.expandSubstitution, false);
  assert.equal(parsed.stages[1]?.redirect, 'append');
  assert.equal(parsed.stages[1]?.target, '/.rshell/tmp/matches');
  assert.equal(Object.isFrozen(parsed.stages), true);
  assert.equal(Object.isFrozen(parsed.stages[0]), true);
  assert.equal(Object.isFrozen(parsed.stages[0]?.words), true);
});

test('parseRshell preserves parser limits and syntax diagnostics', () => {
  assert.deepEqual(parseRshell('x'.repeat(RSHELL_MAX_INPUT_LENGTH + 1)), {
    ok: false,
    message: `Command input is limited to ${RSHELL_MAX_INPUT_LENGTH} characters.`
  });
  assert.deepEqual(parseRshell(Array.from({ length: RSHELL_MAX_STAGES + 1 }, () => 'cat').join(' | ')), {
    ok: false,
    message: `At most ${RSHELL_MAX_STAGES} pipeline stages are allowed.`
  });
  assert.deepEqual(parseRshell(`cat 'unterminated`), {
    ok: false,
    message: 'Unbalanced quote. Close the quote and try again.'
  });
});

test('expansion delegates nested execution and keeps single-quoted substitutions literal', () => {
  const parsed = parseRshell(`echo "$(whoami)" '$(id)' prefix$(date)`);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const calls: Array<{ readonly depth: number; readonly command: string }> = [];
  const expanded = expandStageWords(parsed.stages[0]?.words ?? [], 0, {
    executeSubstitution: (stages, depth) => {
      calls.push({ depth, command: stages[0]?.words.map((word) => word.segments.map(({ value }) => value).join('')).join(' ') ?? '' });
      return { stdout: ['guest'], error: false };
    }
  });

  assert.deepEqual(expanded, {
    ok: true,
    words: ['echo', 'guest', '$(id)', 'prefixguest']
  });
  assert.deepEqual(calls, [
    { depth: 1, command: 'whoami' },
    { depth: 1, command: 'date' }
  ]);
});

test('expansion preserves substitution policy errors and depth limits', () => {
  const redirect = parseRshell('echo $(whoami > /.rshell/tmp/output)');
  assert.equal(redirect.ok, true);
  if (!redirect.ok) return;
  assert.deepEqual(expandStageWords(redirect.stages[0]?.words ?? [], 0, {
    executeSubstitution: () => ({ stdout: [], error: false })
  }), {
    ok: false,
    message: 'Command substitution accepts only pure text commands.'
  });

  const nested = parseRshell('echo $(whoami)');
  assert.equal(nested.ok, true);
  if (!nested.ok) return;
  assert.deepEqual(expandStageWords(nested.stages[0]?.words ?? [], RSHELL_MAX_SUBSTITUTION_DEPTH, {
    executeSubstitution: () => ({ stdout: [], error: false })
  }), {
    ok: true,
    words: ['echo', '']
  });
  assert.deepEqual(expandStageWords(nested.stages[0]?.words ?? [], RSHELL_MAX_SUBSTITUTION_DEPTH + 1, {
    executeSubstitution: () => ({ stdout: [], error: false })
  }), {
    ok: false,
    message: 'Command substitution nesting is too deep.'
  });
});
