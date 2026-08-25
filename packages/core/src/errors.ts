/** Frozen error-code set with fixed HTTP statuses (plan §4.14 / §5.8). */
const CODE_STATUS = {
  UNAUTHENTICATED: 401,
  PASSWORD_REQUIRED: 401,
  WRONG_PASSWORD: 401,
  FORBIDDEN: 403,
  VIEW_AS_READONLY: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  LAST_OWNER: 409,
  IN_USE: 409,
  IMPORT_CONFLICT: 409,
  IMPORT_TOO_NEW: 409,
  ALREADY_DONE: 409,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
} as const;

export type ErrorCode = keyof typeof CODE_STATUS;

export class AppError extends Error {
  readonly params?: Record<string, unknown>;

  constructor(
    readonly code: ErrorCode,
    message: string,
    params?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.params = params;
  }

  get httpStatus(): number {
    return CODE_STATUS[this.code];
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
