import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiError } from './api-error.js';

/** Bodies for errors raised by Nest itself (body parser, router, upload limits). */
const FRAMEWORK_ERRORS: Partial<Record<HttpStatus, [code: string, message: string]>> = {
  [HttpStatus.BAD_REQUEST]: ['bad_request', 'The request body is not valid JSON.'],
  [HttpStatus.NOT_FOUND]: ['not_found', 'Unknown API endpoint.'],
  [HttpStatus.PAYLOAD_TOO_LARGE]: ['too_large', 'The request is larger than the server accepts.'],
};

/** Answers every error in the API's own shape, so the website has one format to read. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    if (res.headersSent) return;

    if (exception instanceof ApiError) {
      res.set(exception.headers).status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const [code, message] = FRAMEWORK_ERRORS[status as HttpStatus] ?? [
        (HttpStatus[status] ?? 'error').toLowerCase(),
        exception.message,
      ];
      res.status(status).json({ error: { code, message } });
      return;
    }
    const req = http.getRequest<Request>();
    this.logger.error(
      `${req.method} ${req.path} failed`,
      exception instanceof Error ? exception.stack : exception,
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: { code: 'internal', message: 'Something went wrong on the server.' } });
  }
}
