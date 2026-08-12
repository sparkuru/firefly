import {
  X_CORE_METADATA_VERSION,
  type DocumentReference,
  type Enhancement,
  type OutlineItem,
  type XCoreMetadata
} from './contracts.js';
import { xCoreError } from './diagnostics.js';
import { validateJsonValue } from './json.js';

const adapterIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function isReference(value: unknown): value is DocumentReference {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['role', 'kind', 'target']) &&
    (value.role === 'link' || value.role === 'resource') &&
    (value.kind === 'fragment' ||
      value.kind === 'internal' ||
      value.kind === 'relative' ||
      value.kind === 'external') &&
    typeof value.target === 'string'
  );
}

function isOutlineItem(value: unknown): value is OutlineItem {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['depth', 'id', 'text']) &&
    Number.isInteger(value.depth) &&
    typeof value.depth === 'number' &&
    value.depth >= 1 &&
    value.depth <= 6 &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.text === 'string'
  );
}

function isEnhancement(value: unknown): value is Enhancement {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['nodeId', 'feature', 'module', 'load', 'props']) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.trim().length > 0 &&
    typeof value.feature === 'string' &&
    value.feature.trim().length > 0 &&
    typeof value.module === 'string' &&
    value.module.trim().length > 0 &&
    (value.load === 'eager' || value.load === 'idle' || value.load === 'visible') &&
    isRecord(value.props)
  );
}

function parseArray<T>(
  value: unknown,
  predicate: (item: unknown) => item is T
): readonly T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed: T[] = [];

  for (const item of value) {
    if (!predicate(item)) {
      return undefined;
    }

    parsed.push(item);
  }

  return parsed;
}

export function parseXCoreMetadata(
  value: unknown,
  owner = 'rendered document'
): XCoreMetadata {
  validateJsonValue(value, '$.xCore');

  if (!isRecord(value)) {
    throw xCoreError(
      'XCORE_INVALID_METADATA',
      `Missing X Core metadata for ${owner}.`
    );
  }

  if (
    !hasExactKeys(value, [
      'version',
      'presentation',
      'summary',
      'references',
      'outline',
      'enhancements'
    ])
  ) {
    throw xCoreError(
      'XCORE_INVALID_METADATA',
      `Malformed X Core metadata fields for ${owner}.`
    );
  }

  if (value.version !== X_CORE_METADATA_VERSION) {
    throw xCoreError(
      'XCORE_INVALID_METADATA',
      `Unsupported X Core metadata version for ${owner}.`
    );
  }

  const references = parseArray(value.references, isReference);
  const outline = parseArray(value.outline, isOutlineItem);
  const enhancements = parseArray(value.enhancements, isEnhancement);

  if (
    typeof value.presentation !== 'string' ||
    !adapterIdPattern.test(value.presentation) ||
    typeof value.summary !== 'string' ||
    !references ||
    !outline ||
    !enhancements
  ) {
    throw xCoreError(
      'XCORE_INVALID_METADATA',
      `Malformed X Core metadata for ${owner}.`
    );
  }

  return {
    version: X_CORE_METADATA_VERSION,
    presentation: value.presentation,
    summary: value.summary,
    references,
    outline,
    enhancements
  };
}
