import type { Dict } from '@models/i18n.model';
import { type ApiFailure } from '@models/api.model';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()./-]{6,24}$/;

/** Longest texts the API accepts in the public forms. */
export const TEXT_LIMITS = { name: 120, email: 254, message: 4000, note: 2000 } as const;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function isPhone(value: string): boolean {
  return PHONE.test(value.trim());
}

/** Turns a field error code of the API (or of the same checks in the browser) into a sentence. */
export function fieldMessage(t: Dict, field: string, code: string): string {
  const e = t.errors;
  if (field === 'consent') return e.consent;
  if (field === 'captcha') return code === 'invalid' ? e.captcha_invalid : e.captcha_required;
  if (code === 'invalid' && field === 'email') return e.invalid_email;
  if (code === 'invalid' && field === 'phone') return e.invalid_phone;
  if (code === 'too_long') return e.too_long;
  if (code === 'over_capacity') return e.over_capacity;
  if (code === 'in_past') return e.in_past;
  if (code === 'before_check_in') return t.booking.datesInvalid;
  return e.required;
}

export function valueOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
}

export function checkedOf(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

/**
 * The API checks a captcha answer once. It was spent unless the request was stopped
 * earlier: by the rate limit, by another invalid field, or before reaching the server.
 */
export function captchaSpent(failure: ApiFailure): boolean {
  if (failure.code === 'validation') return 'captcha' in failure.fields;
  return failure.status >= 400 && failure.status !== 429;
}

/** The sentence shown above the submit button when a public form could not be sent. */
export function submitFailure(t: Dict, failure: ApiFailure): string {
  if (failure.status === 429) return t.errors.rate_limited;
  if (failure.status === 0) return t.errors.offline;
  if (failure.code === 'captcha_unavailable') return t.errors.captcha_unavailable;
  return t.errors.generic;
}
