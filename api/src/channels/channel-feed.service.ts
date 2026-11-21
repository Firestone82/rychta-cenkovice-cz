import { lookup } from 'node:dns/promises';
import { Injectable } from '@nestjs/common';
import { isPublicAddress } from './address.util.js';

export type FeedError = 'address' | 'unreachable' | 'http' | 'too_large' | 'not_calendar';

/** A feed that could not be read; `code` is what the administration shows. */
export class FeedFailure extends Error {
  constructor(readonly code: FeedError) {
    super(code);
  }
}

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;

/** Downloads calendar feeds from addresses typed in by an administrator. */
@Injectable()
export class ChannelFeedService {
  /** The text of the feed. Throws `FeedFailure`; its message never contains the address. */
  async fetch(url: string): Promise<string> {
    let target = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await this.assertPublic(target);
      const response = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'text/calendar, text/plain;q=0.8' },
      }).catch(() => {
        throw new FeedFailure('unreachable');
      });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        target = new URL(location, target).href;
        continue;
      }
      if (!response.ok) throw new FeedFailure('http');
      return this.read(response);
    }
    throw new FeedFailure('unreachable');
  }

  /** The feed must live on the internet, not on the server's own network. */
  private async assertPublic(url: string): Promise<void> {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') throw new FeedFailure('address');
    const addresses = await lookup(hostname.replace(/^\[|\]$/g, ''), { all: true }).catch(() => {
      throw new FeedFailure('unreachable');
    });
    if (!addresses.every(({ address }) => isPublicAddress(address))) {
      throw new FeedFailure('address');
    }
  }

  private async read(response: Response): Promise<string> {
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for await (const chunk of response.body ?? []) {
        size += chunk.byteLength;
        if (size > MAX_BYTES) throw new FeedFailure('too_large');
        chunks.push(chunk);
      }
    } catch (error) {
      throw error instanceof FeedFailure ? error : new FeedFailure('unreachable');
    }
    return Buffer.concat(chunks).toString('utf8');
  }
}
