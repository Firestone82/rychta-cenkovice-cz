import { HttpException, HttpStatus } from '@nestjs/common';

/** Field name mapped to an error code the website translates (`required`, `invalid`, `too_long`, ...). */
export type FieldErrors = Record<string, string>;

/** An error with the API's response body: `{ error: { code, message, fields? }, ...extra }`. */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    options: {
      fields?: FieldErrors;
      extra?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {},
  ) {
    const { fields, extra, headers } = options;
    super({ error: { code, message, ...(fields && { fields }) }, ...extra }, status);
    this.headers = headers ?? {};
  }

  readonly headers: Record<string, string>;
}

export const notFound = () =>
  new ApiError(HttpStatus.NOT_FOUND, 'not_found', 'The record does not exist.');

export const validationFailed = (fields: FieldErrors) =>
  new ApiError(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'validation',
    'Some fields are missing or invalid.',
    {
      fields,
    },
  );

export const unavailable = (apartmentIds: number[]) =>
  new ApiError(
    HttpStatus.CONFLICT,
    'unavailable',
    'Some of the selected apartments are no longer free for these dates.',
    { extra: { apartment_ids: apartmentIds } },
  );

export const importedBlock = () =>
  new ApiError(
    HttpStatus.CONFLICT,
    'imported',
    'This block follows the calendar of a booking portal and is changed there.',
  );

export const tooManyRequests = (retryAfterSeconds: number) =>
  new ApiError(
    HttpStatus.TOO_MANY_REQUESTS,
    'rate_limited',
    'Too many attempts. Try again later.',
    {
      extra: { retry_after: retryAfterSeconds },
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  );
