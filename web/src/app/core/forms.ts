import type { Dict } from './i18n/types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()./-]{6,24}$/;

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

/** Value of the input, select or textarea that fired an event. */
export function valueOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
}

export function checkedOf(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}
