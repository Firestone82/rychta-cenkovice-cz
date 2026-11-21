import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Not, IsNull, Repository } from 'typeorm';
import { Apartment } from '../apartments/apartment.entity.js';
import { Booking } from '../bookings/booking.entity.js';
import { notFound, validationFailed } from '../common/api-error.js';
import { today } from '../common/dates.util.js';
import { ChannelConnection } from './channel-connection.entity.js';
import { ChannelSyncService } from './channel-sync.service.js';
import { type ChannelView, presentChannel } from './channel.presenter.js';
import type { ChannelSave } from './channels.schemas.js';

/** The calendars of booking portals connected to the apartments. */
@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(ChannelConnection)
    private readonly connections: Repository<ChannelConnection>,
    @InjectRepository(Apartment) private readonly apartments: Repository<Apartment>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly synchroniser: ChannelSyncService,
  ) {}

  async list(): Promise<ChannelView[]> {
    const connections = await this.connections.find({ order: { apartmentId: 'ASC', id: 'ASC' } });
    const upcoming = await this.bookings.find({
      select: { id: true, channelConnectionId: true },
      where: { channelConnectionId: Not(IsNull()), checkOut: MoreThan(today()) },
    });
    return connections.map((connection) =>
      presentChannel(
        connection,
        upcoming.filter((block) => block.channelConnectionId === connection.id).length,
      ),
    );
  }

  /** Stores the address and reads the calendar at once; null when it was disconnected. */
  async save({ apartment_id, provider, import_url }: ChannelSave): Promise<ChannelView | null> {
    if (!(await this.apartments.existsBy({ id: apartment_id }))) {
      throw validationFailed({ apartment_id: 'unknown' });
    }
    const where = { apartmentId: apartment_id, provider };
    if (import_url === '') {
      // The blocks of the calendar go with it.
      await this.connections.delete(where);
      return null;
    }
    const connection = (await this.connections.findOneBy(where)) ?? this.connections.create(where);
    connection.importUrl = import_url;
    const { id } = await this.connections.save(connection);
    return this.sync(id);
  }

  async sync(id: number): Promise<ChannelView> {
    if (!(await this.connections.existsBy({ id }))) throw notFound();
    await this.synchroniser.sync(id);
    const view = (await this.list()).find((channel) => channel.id === id);
    if (!view) throw notFound();
    return view;
  }
}
