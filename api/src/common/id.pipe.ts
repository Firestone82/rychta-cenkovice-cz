import { Injectable, type PipeTransform } from '@nestjs/common';
import { notFound } from './api-error.js';

const MAX_ID = 2_147_483_647;

/** A record id from the path. Anything that cannot be an id is simply "not found". */
@Injectable()
export class IdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = /^[1-9]\d{0,9}$/.test(value) ? Number(value) : 0;
    if (id < 1 || id > MAX_ID) throw notFound();
    return id;
  }
}
