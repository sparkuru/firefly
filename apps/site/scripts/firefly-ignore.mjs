import ignore from 'ignore';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const policyFilename = '.fireflyignore';
const invalidTrailingBackslash = /(?:[^\\]|^)\\$/u;

function policyPath(logicalSegments) {
  return logicalSegments.length === 0
    ? policyFilename
    : `${logicalSegments.join('/')}/${policyFilename}`;
}

function policyError(message, logicalPath, lineNumber) {
  const location = lineNumber === undefined ? logicalPath : `${logicalPath}:${lineNumber}`;
  return new Error(`${message} at ${location}`);
}

function pathSegments(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value.split('/').filter(Boolean);
}

function startsWithSegments(pathname, prefix) {
  return prefix.every((segment, index) => pathname[index] === segment);
}

function candidatePath(segments, directory) {
  const pathname = segments.join('/');
  return directory ? `${pathname}/` : pathname;
}

function findMatchedLine(rules, pathname, result) {
  if (result.rule?.mark !== undefined) {
    return Number(result.rule.mark);
  }

  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const ruleResult = rules[index].matcher.test(pathname);
    if (result.ignored && ruleResult.ignored) {
      return rules[index].line;
    }
    if (result.unignored && ruleResult.unignored) {
      return rules[index].line;
    }
  }
  return undefined;
}

export function parseFireflyIgnore(text, { logicalPath = policyFilename } = {}) {
  if (typeof text !== 'string') {
    throw new TypeError('Firefly ignore policy text must be a string.');
  }

  const matcher = ignore({ ignorecase: false });
  const rules = [];
  const lines = text.split(/\r\n|\n|\r/u);
  for (const [index, pattern] of lines.entries()) {
    const line = index + 1;
    const ruleMatcher = ignore({ ignorecase: false });
    try {
      if (invalidTrailingBackslash.test(pattern)) {
        throw new Error('invalid trailing escape');
      }
      matcher.add({ pattern, mark: String(line) });
      ruleMatcher.add(pattern);
    } catch {
      throw policyError('Invalid .fireflyignore pattern', logicalPath, line);
    }
    rules.push(Object.freeze({ line, matcher: ruleMatcher }));
  }

  return Object.freeze({
    logicalPath,
    test(pathname) {
      return matcher.test(pathname);
    },
    matchedLine(pathname, result) {
      return findMatchedLine(rules, pathname, result);
    }
  });
}

export const createFireflyIgnorePolicy = parseFireflyIgnore;

export async function loadFireflyIgnorePolicy(directoryPath, logicalSegments = []) {
  const policyPhysicalPath = path.join(directoryPath, policyFilename);
  const logicalPath = policyPath(logicalSegments);
  let policyStat;
  try {
    policyStat = await lstat(policyPhysicalPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw policyError('Unable to read .fireflyignore', logicalPath);
  }

  if (policyStat.isSymbolicLink()) {
    throw policyError('Unsafe hidden content link', logicalPath);
  }
  if (!policyStat.isFile()) {
    throw policyError('Unsupported .fireflyignore node', logicalPath);
  }

  let handle;
  try {
    handle = await open(policyPhysicalPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const openedStat = await handle.stat();
    if (!openedStat.isFile()) {
      throw new Error('not a regular file');
    }
    const bytes = await handle.readFile();
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw policyError('Unable to decode .fireflyignore', logicalPath);
    }
    return parseFireflyIgnore(text, { logicalPath });
  } catch (error) {
    if (error instanceof Error && error.message.includes(` at ${logicalPath}`)) {
      throw error;
    }
    throw policyError('Unable to read .fireflyignore', logicalPath);
  } finally {
    await handle?.close();
  }
}

export function decideFireflyIgnore(policyChain, candidate, {
  directory = false,
  blockedByIgnoredParent = false
} = {}) {
  const candidateSegments = pathSegments(candidate);
  if (blockedByIgnoredParent) {
    return Object.freeze({
      ignored: true,
      blockedByIgnoredParent: true
    });
  }

  let ignored = false;
  let matchedPolicyPath;
  let matchedLine;
  for (const { baseSegments, policy } of policyChain) {
    if (!startsWithSegments(candidateSegments, baseSegments)) {
      continue;
    }
    const localSegments = candidateSegments.slice(baseSegments.length);
    if (localSegments.length === 0) {
      continue;
    }
    const result = policy.test(candidatePath(localSegments, directory));
    if (!result.ignored && !result.unignored) {
      continue;
    }
    ignored = result.ignored;
    matchedPolicyPath = policy.logicalPath;
    matchedLine = policy.matchedLine(candidatePath(localSegments, directory), result);
  }

  return Object.freeze({
    ignored,
    blockedByIgnoredParent: false,
    ...(matchedPolicyPath === undefined ? {} : { matchedPolicyPath }),
    ...(matchedLine === undefined ? {} : { matchedLine })
  });
}

export { policyPath };
