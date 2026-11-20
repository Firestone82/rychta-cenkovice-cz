import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody, ApiFailure } from '@models/api.model';

export function toFailure(err: unknown): ApiFailure {
  if (err instanceof HttpErrorResponse) {
    const body = (err.error ?? {}) as ApiErrorBody;
    return {
      status: err.status,
      code: body.error?.code ?? (err.status === 0 ? 'offline' : 'internal'),
      fields: body.error?.fields ?? {},
      apartmentIds: body.apartment_ids ?? [],
      retryAfter: body.retry_after ?? 0,
    };
  }
  return { status: 0, code: 'internal', fields: {}, apartmentIds: [], retryAfter: 0 };
}
