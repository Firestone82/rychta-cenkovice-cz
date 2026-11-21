import { Injectable } from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { type BookingDraft, BookingsService } from '../bookings/bookings.service.js';
import { addDays, today } from '../common/dates.util.js';
import { MessagesService } from '../messages/messages.service.js';

type DemoBooking = Partial<BookingDraft> &
  Pick<BookingDraft, 'status' | 'checkIn' | 'checkOut' | 'name'>;

/**
 * Adds a few example bookings and messages so the administration is not empty while trying the
 * application out. Never run automatically.
 */
@Injectable()
export class DemoSeedService {
  constructor(
    private readonly apartments: ApartmentsService,
    private readonly bookings: BookingsService,
    private readonly messages: MessagesService,
  ) {}

  async run(): Promise<void> {
    const apartments = await this.apartments.list(true);
    if (apartments.length < 6) throw new Error('The six seeded apartments are missing');
    const day = (offset: number) => addDays(today(), offset);
    const id = (number: number) => apartments[number - 1].id;

    await this.messages.create({
      name: 'Jana Dvořáková',
      email: 'jana.dvorakova@example.com',
      phone: '+420 777 123 456',
      language: 'cs',
      body: `Dobrý den, měli bychom zájem o pobyt pro 14 lidí (dvě rodiny s dětmi) od ${day(40)} do ${day(44)}. Je možné propojit apartmány 4 a 5? Děkuji.`,
    });
    await this.messages.create({
      name: 'Tom Becker',
      email: 'tom.becker@example.com',
      phone: '',
      language: 'en',
      body: 'Hello, is the hot tub available in winter and can we bring our own skis into the ski room? We are thinking about the second week of February.',
    });

    const demo: DemoBooking[] = [
      {
        status: 'confirmed',
        source: 'admin',
        checkIn: day(-2),
        checkOut: day(3),
        guests: 9,
        name: 'Petr Novák',
        email: 'petr.novak@example.com',
        phone: '+420 602 111 222',
        apartmentIds: [id(3)],
        adminNote: 'Záloha zaplacena převodem.',
      },
      {
        status: 'confirmed',
        checkIn: day(1),
        checkOut: day(4),
        guests: 4,
        name: 'Lucie Králová',
        email: 'lucie.kralova@example.com',
        phone: '+420 731 555 010',
        apartmentIds: [id(1)],
      },
      {
        status: 'confirmed',
        source: 'admin',
        checkIn: day(6),
        checkOut: day(13),
        guests: 28,
        name: 'Lyžařský oddíl Sokol',
        email: 'sokol@example.com',
        phone: '+420 603 987 654',
        apartmentIds: [id(1), id(2), id(3), id(5), id(6)],
        note: 'Celý týden, přijedeme autobusem.',
      },
      {
        status: 'pending',
        checkIn: day(15),
        checkOut: day(18),
        guests: 6,
        name: 'Anna Schmidt',
        email: 'anna.schmidt@example.com',
        phone: '+49 170 5550123',
        language: 'en',
        apartmentIds: [id(2)],
        note: 'We arrive late on Friday, around 9 pm.',
      },
      {
        status: 'pending',
        checkIn: day(20),
        checkOut: day(23),
        guests: 5,
        name: 'Martin Svoboda',
        email: 'martin.svoboda@example.com',
        phone: '+420 724 000 321',
        apartmentIds: [id(6)],
      },
      {
        kind: 'block',
        status: 'confirmed',
        source: 'admin',
        checkIn: day(8),
        checkOut: day(11),
        guests: 0,
        name: 'Malování',
        apartmentIds: [id(4)],
        adminNote: 'Malování a drobné opravy.',
      },
      {
        status: 'cancelled',
        checkIn: day(25),
        checkOut: day(27),
        guests: 3,
        name: 'Eva Malá',
        email: 'eva.mala@example.com',
        apartmentIds: [id(4)],
      },
    ];
    for (const booking of demo) {
      await this.bookings.create({
        kind: 'guest',
        source: 'web',
        guests: 0,
        email: '',
        phone: '',
        note: '',
        adminNote: '',
        totalPrice: null,
        language: 'cs',
        messageId: null,
        createdById: null,
        apartmentIds: [],
        ...booking,
      });
    }
  }
}
