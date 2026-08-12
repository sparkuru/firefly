import type {
  DiagnosticDocument,
  DocumentContext,
  XCoreDiagnostic
} from './contracts.js';

function diagnosticDocument(
  context: DocumentContext | DiagnosticDocument | undefined
): DiagnosticDocument | undefined {
  if (!context) {
    return undefined;
  }

  return {
    documentId: context.documentId,
    ...(context.sourcePath ? { sourcePath: context.sourcePath } : {}),
    route: context.route
  };
}

function formatDiagnostic(diagnostic: XCoreDiagnostic): string {
  const owner = diagnostic.document
    ? ` [document=${diagnostic.document.documentId}, route=${diagnostic.document.route}${diagnostic.document.sourcePath ? `, source=${diagnostic.document.sourcePath}` : ''}]`
    : '';
  const node = diagnostic.nodeId ? ` [nodeId=${diagnostic.nodeId}]` : '';

  return `${diagnostic.code}: ${diagnostic.message}${owner}${node}`;
}

export class XCoreError extends Error {
  readonly diagnostic: XCoreDiagnostic;

  constructor(diagnostic: XCoreDiagnostic, options?: ErrorOptions) {
    super(formatDiagnostic(diagnostic), options);
    this.name = 'XCoreError';
    this.diagnostic = diagnostic;
  }
}

export function xCoreError(
  code: `XCORE_${string}`,
  message: string,
  context?: DocumentContext | DiagnosticDocument,
  nodeId?: string,
  cause?: unknown
): XCoreError {
  return new XCoreError(
    {
      severity: 'error',
      code,
      message,
      ...(context ? { document: diagnosticDocument(context) } : {}),
      ...(nodeId ? { nodeId } : {})
    },
    cause === undefined ? undefined : { cause }
  );
}
