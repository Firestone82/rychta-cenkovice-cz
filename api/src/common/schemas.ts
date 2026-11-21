import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';
import { type FieldErrors, validationFailed } from './api-error.js';

const ERROR_CODE = /^[a-z_]+$/;

/**
 * Turns schema issues into one error code per top-level field. Schemas carry the code as the
 * message of a rule; an issue without one (a wrong type deep inside a value) reads `invalid`.
 */
export function fieldErrors(issues: readonly StandardSchemaV1.Issue[]): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of issues) {
    const first = issue.path?.[0];
    const key = String(typeof first === 'object' ? first.key : (first ?? 'body'));
    fields[key] ??= ERROR_CODE.test(issue.message) ? issue.message : 'invalid';
  }
  return fields;
}

export const schemaValidationPipe = () =>
  new StandardSchemaValidationPipe({
    exceptionFactory: (issues) => validationFailed(fieldErrors(issues)),
  });

/** A trimmed string; `code` is reported when the value is missing or not a string. */
export const text = (code = 'invalid') => z.string(code).trim();

export const email = (code = 'invalid') => text(code).max(254, code).regex(z.regexes.email, code);

export const PHONE = /^\+?[0-9 ()./-]{6,24}$/;

export const isEmail = (value: string): boolean => email().safeParse(value).success;
export const isPhone = (value: string): boolean => PHONE.test(value);

/** Anything but `en` is Czech, the website's default language, also when the field is missing. */
export const language = z
  .unknown()
  .optional()
  .transform((value): 'cs' | 'en' => (value === 'en' ? 'en' : 'cs'));

export const localized = (max: number, code = 'too_long') =>
  z.object({ cs: text().max(max, code).default(''), en: text().max(max, code).default('') });

/** A whole number from a query string, falling back when it is missing or malformed. */
export const queryInt = (fallback: number) =>
  z.coerce.number().int().catch(fallback).default(fallback);
