import { timestamp } from '../common/dates.util.js';
import type { ChannelConnection } from './channel-connection.entity.js';

/** `blocks` is the number of upcoming blocks the calendar holds. */
export const presentChannel = (connection: ChannelConnection, blocks: number) => ({
  id: connection.id,
  apartment_id: connection.apartmentId,
  provider: connection.provider,
  import_url: connection.importUrl,
  synced_at: connection.syncedAt && timestamp(connection.syncedAt),
  error: connection.lastError,
  blocks,
});

export type ChannelView = ReturnType<typeof presentChannel>;
