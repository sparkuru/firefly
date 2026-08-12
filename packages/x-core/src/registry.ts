import type {
  DocumentContext,
  PresentationAdapter
} from './contracts.js';
import { XCoreError, xCoreError } from './diagnostics.js';

const adapterIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

export function normalizeAdapterId(value: unknown): string {
  if (typeof value !== 'string') {
    throw xCoreError(
      'XCORE_INVALID_ADAPTER_ID',
      'Presentation adapter IDs must be strings.'
    );
  }

  const normalized = value.trim().toLowerCase();

  if (!adapterIdPattern.test(normalized)) {
    throw xCoreError(
      'XCORE_INVALID_ADAPTER_ID',
      `Presentation adapter ID "${value}" must use lowercase kebab-case.`
    );
  }

  return normalized;
}

export class PresentationRegistry {
  readonly #adapters = new Map<string, PresentationAdapter>();
  readonly #defaultId: string;

  constructor(defaultId = 'semantic') {
    this.#defaultId = normalizeAdapterId(defaultId);
  }

  register(adapter: PresentationAdapter): this {
    let isValidAdapter = false;

    try {
      isValidAdapter =
        typeof adapter === 'object' &&
        adapter !== null &&
        typeof adapter.supports === 'function' &&
        typeof adapter.transform === 'function' &&
        typeof adapter.enhancements === 'function';
    } catch (error) {
      throw xCoreError(
        'XCORE_INVALID_ADAPTER',
        'Presentation adapter members could not be inspected.',
        undefined,
        undefined,
        error
      );
    }

    if (!isValidAdapter) {
      throw xCoreError(
        'XCORE_INVALID_ADAPTER',
        'Presentation adapters require id, supports, transform, and enhancements members.'
      );
    }

    let idValue: unknown;

    try {
      idValue = adapter.id;
    } catch (error) {
      throw xCoreError(
        'XCORE_INVALID_ADAPTER',
        'Presentation adapter ID could not be inspected.',
        undefined,
        undefined,
        error
      );
    }

    const id = normalizeAdapterId(idValue);

    if (this.#adapters.has(id)) {
      throw xCoreError(
        'XCORE_DUPLICATE_ADAPTER',
        `Presentation adapter "${id}" is already registered.`
      );
    }

    this.#adapters.set(id, adapter);
    return this;
  }

  resolve(context: DocumentContext): PresentationAdapter {
    const requested = normalizeAdapterId(context.presentation || this.#defaultId);
    const adapter = this.#adapters.get(requested);

    if (!adapter) {
      throw xCoreError(
        'XCORE_UNKNOWN_PRESENTATION',
        `Presentation "${requested}" is not registered.`,
        context
      );
    }

    let supported: unknown;

    try {
      supported = adapter.supports(context);
    } catch (error) {
      if (error instanceof XCoreError) {
        throw error;
      }

      throw xCoreError(
        'XCORE_ADAPTER_SUPPORT_FAILED',
        `Presentation "${requested}" failed while checking document support.`,
        context,
        undefined,
        error
      );
    }

    if (typeof supported !== 'boolean') {
      throw xCoreError(
        'XCORE_INVALID_ADAPTER_RESULT',
        `Presentation "${requested}" returned a non-boolean support result.`,
        context
      );
    }

    if (!supported) {
      throw xCoreError(
        'XCORE_UNSUPPORTED_CONTEXT',
        `Presentation "${requested}" does not support ${context.collection}/${context.layout}.`,
        context
      );
    }

    return adapter;
  }
}
