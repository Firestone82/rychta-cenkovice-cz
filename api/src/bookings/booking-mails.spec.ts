import type { Apartment } from '../apartments/apartment.entity.js';
import { newBookingCode } from './booking-code.js';
import { guestMail, ownerRequestMail } from './booking-mails.js';
import type { BookingView } from './booking.presenter.js';

const settings = { owner: 'owner@example.com', publicUrl: 'https://www.rychtacenkovice.cz' };
const apartments = [
  { number: 2, name: { cs: '', en: '' } },
  { number: 5, name: { cs: 'Pod střechou', en: '' } },
] as Apartment[];
const booking = (overrides: Partial<BookingView> = {}) =>
  ({
    id: 7,
    code: 'RC-7KQ2MX',
    check_in: '2027-02-06',
    check_out: '2027-02-13',
    nights: 7,
    guests: 6,
    name: 'Jan Novák',
    email: 'jan@example.com',
    phone: '+420 600 000 000',
    note: '',
    total_price: 31500,
    language: 'cs',
    ...overrides,
  }) as BookingView;

describe('booking e-mails', () => {
  it('tells the owner everything about a request, with the guest as the reply address', () => {
    const mail = ownerRequestMail(
      booking({ note: 'Přijedeme pozdě večer.' }),
      apartments,
      settings,
    );
    expect(mail).toMatchObject({ to: 'owner@example.com', replyTo: 'jan@example.com' });
    expect(mail.subject).toBe('Nová poptávka RC-7KQ2MX: 6. 2. 2027 – 13. 2. 2027, Jan Novák');
    expect(mail.text).toContain('Apartmány: Apartmán 2, Apartmán 5 – Pod střechou');
    expect(mail.text).toContain('Orientační cena: 31 500 Kč');
    expect(mail.text).toContain('Přijedeme pozdě večer.');
    expect(mail.text).toContain('https://www.rychtacenkovice.cz/admin/bookings/7');
  });

  it('writes to the guest in their language', () => {
    const czech = guestMail(booking(), apartments, 'received', '', settings);
    expect(czech).toMatchObject({ to: 'jan@example.com', replyTo: 'owner@example.com' });
    expect(czech.subject).toBe('Přijali jsme vaši poptávku RC-7KQ2MX');
    expect(czech.text).toContain('Termín: 6. 2. 2027 – 13. 2. 2027 (7 nocí)');

    const english = guestMail(
      booking({ language: 'en', total_price: null }),
      apartments,
      'confirmed',
      '',
      settings,
    );
    expect(english.subject).toBe('Your booking RC-7KQ2MX is confirmed');
    expect(english.text).toContain('Hello Jan Novák,');
    expect(english.text).toContain('Dates: 6 February 2027 – 13 February 2027 (7 nights)');
    expect(english.text).toContain('Apartments: Apartment 2, Apartment 5 – Pod střechou');
    expect(english.text).toContain('Price: we will confirm the price by e-mail');
  });

  it('puts the owner’s own words into a confirmation or cancellation only', () => {
    const words = 'Parkování je za domem.';
    expect(guestMail(booking(), apartments, 'confirmed', words, settings).text).toContain(
      `Zpráva od nás:\n${words}`,
    );
    expect(guestMail(booking(), apartments, 'cancelled', words, settings).text).toContain(words);
    expect(guestMail(booking(), apartments, 'received', words, settings).text).not.toContain(words);
  });
});

describe('booking codes', () => {
  it('are short, unambiguous to read aloud and practically unique', () => {
    const codes = Array.from({ length: 500 }, newBookingCode);
    expect(codes.every((code) => /^RC-[A-HJKMNP-Z2-9]{6}$/.test(code))).toBe(true);
    expect(new Set(codes).size).toBe(500);
  });
});
