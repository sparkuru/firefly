import type { JsonValue } from './contracts.js';
import { XCoreError, xCoreError } from './diagnostics.js';

const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

function unsafeJson(message: string, cause?: unknown): never {
  throw xCoreError(
    'XCORE_UNSAFE_JSON',
    message,
    undefined,
    undefined,
    cause
  );
}

function ownDataDescriptor(
  value: object,
  key: PropertyKey,
  path: string
): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);

  if (!descriptor || !('value' in descriptor)) {
    unsafeJson(`Expected a data property at ${path}.`);
  }

  return descriptor;
}

function assertJsonValue(
  value: unknown,
  path: string,
  ancestors: Set<object>
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return;
    }

    unsafeJson(`Expected a finite JSON number at ${path}.`);
  }

  if (typeof value !== 'object') {
    unsafeJson(`Expected a JSON value at ${path}, received ${typeof value}.`);
  }

  if (ancestors.has(value)) {
    unsafeJson(`Cyclic JSON value detected at ${path}.`);
  }

  ancestors.add(value);

  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      unsafeJson(`Expected a plain JSON array at ${path}.`);
    }

    const keys = Reflect.ownKeys(value);

    for (const key of keys) {
      if (key === 'length') {
        continue;
      }

      if (
        typeof key !== 'string' ||
        !/^(?:0|[1-9]\d*)$/u.test(key) ||
        Number(key) >= value.length
      ) {
        unsafeJson(`Unexpected JSON array property at ${path}.`);
      }

      const descriptor = ownDataDescriptor(value, key, `${path}[${key}]`);

      if (!descriptor.enumerable) {
        unsafeJson(`Expected an enumerable JSON array item at ${path}[${key}].`);
      }
    }

    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        unsafeJson(`Sparse JSON array detected at ${path}[${index}].`);
      }

      const descriptor = ownDataDescriptor(value, index, `${path}[${index}]`);
      assertJsonValue(descriptor.value, `${path}[${index}]`, ancestors);
    }
    ancestors.delete(value);
    return;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    unsafeJson(`Expected a plain JSON object at ${path}.`);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      unsafeJson(`Expected enumerable string keys at ${path}.`);
    }

    if (forbiddenKeys.has(key)) {
      unsafeJson(`Forbidden JSON key "${key}" at ${path}.`);
    }

    const descriptor = ownDataDescriptor(value, key, `${path}.${key}`);

    if (!descriptor.enumerable) {
      unsafeJson(`Expected enumerable string keys at ${path}.`);
    }

    assertJsonValue(descriptor.value, `${path}.${key}`, ancestors);
  }

  ancestors.delete(value);
}

export function validateJsonValue(
  value: unknown,
  path = '$'
): asserts value is JsonValue {
  try {
    assertJsonValue(value, path, new Set());
  } catch (error) {
    if (error instanceof XCoreError) {
      throw error;
    }

    unsafeJson(`Unable to inspect JSON value at ${path}.`, error);
  }
}
