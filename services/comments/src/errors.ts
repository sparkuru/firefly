export class CommentServiceError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'CommentServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends CommentServiceError {
  readonly issues: string[];

  constructor(issues: string[] | string, code = 'invalid_request') {
    const normalized = Array.isArray(issues) ? issues : [issues];
    super(code, normalized.join('; '), 400);
    this.name = 'ValidationError';
    this.issues = normalized;
  }
}

export class ExportValidationError extends ValidationError {
  constructor(issues: string[] | string) {
    super(issues, 'invalid_public_export');
    this.name = 'ExportValidationError';
  }
}

export class TokenError extends CommentServiceError {
  constructor(message = 'The token is invalid or expired.') {
    super('invalid_token', message, 400);
    this.name = 'TokenError';
  }
}

export class NotFoundError extends CommentServiceError {
  constructor(message = 'The requested comment was not found.') {
    super('not_found', message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CommentServiceError {
  constructor(message: string) {
    super('invalid_state', message, 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends CommentServiceError {
  constructor(message = 'Authentication is required.') {
    super('unauthorized', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends CommentServiceError {
  constructor(message = 'The operation is not allowed.') {
    super('forbidden', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends CommentServiceError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('rate_limited', 'Too many submissions. Try again later.', 429);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class NotificationDeliveryError extends CommentServiceError {
  constructor() {
    super('notification_unavailable', 'The notification could not be queued.', 503);
    this.name = 'NotificationDeliveryError';
  }
}
