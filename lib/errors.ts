/**
 * Authentication / authorization error hierarchy.
 *
 * These are thrown by `lib/permissions.ts#requireSession` (401) and
 * `lib/permissions.ts#requireHouseholdMember` (403) so that route handlers can
 * map errors to HTTP responses via a single `err instanceof AuthError` check —
 * no more string-matching on `err.message`.
 *
 * `setPrototypeOf` calls below work around the well-known TypeScript /
 * `extends Error` prototype-chain bug on Node < 22.
 */
export class AuthError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
