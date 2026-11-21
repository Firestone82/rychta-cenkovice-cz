import type { Apartment } from '../apartments/apartment.entity.js';
import type { Mail } from '../mail/mail.service.js';
import type { BookingView } from './booking.presenter.js';

type Language = 'cs' | 'en';

/** What the guest is told about: the request arrived, it was confirmed, or it was cancelled. */
export type GuestNotice = 'received' | 'confirmed' | 'cancelled';

export interface MailSettings {
  /** The owner's mailbox: receives requests and is the reply address for guests. */
  owner: string;
  publicUrl: string;
}

const englishDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function date(iso: string, language: Language): string {
  const [year, month, day] = iso.split('-').map(Number);
  return language === 'en'
    ? englishDate.format(Date.UTC(year, month - 1, day))
    : `${day}. ${month}. ${year}`;
}

function price(value: number | null, language: Language): string {
  if (value === null) {
    return language === 'en'
      ? 'we will confirm the price by e-mail'
      : 'cenu vám potvrdíme e-mailem';
  }
  return `${String(value).replace(/\B(?=(\d{3})+$)/g, ' ')} Kč`;
}

const apartmentNames = (apartments: Apartment[], language: Language): string =>
  apartments
    .map((a) => {
      const alias = a.name[language] || a.name.cs;
      const title = `${language === 'en' ? 'Apartment' : 'Apartmán'} ${a.number}`;
      return alias ? `${title} – ${alias}` : title;
    })
    .join(', ');

const orDash = (value: string): string => value.trim() || '–';

/** Tells the owner about a new booking request from the website. */
export function ownerRequestMail(
  booking: BookingView,
  apartments: Apartment[],
  settings: MailSettings,
): Mail {
  const from = date(booking.check_in, 'cs');
  const to = date(booking.check_out, 'cs');
  return {
    to: settings.owner,
    replyTo: booking.email,
    subject: `Nová poptávka ${booking.code}: ${from} – ${to}, ${booking.name}`,
    text: `Nová poptávka rezervace z webu.

Kód: ${booking.code}
Termín: ${from} – ${to} (${booking.nights} nocí)
Apartmány: ${apartmentNames(apartments, 'cs')}
Počet osob: ${booking.guests}
Orientační cena: ${price(booking.total_price, 'cs')}

Jméno: ${booking.name}
E-mail: ${booking.email}
Telefon: ${booking.phone}

Poznámka hosta:
${orDash(booking.note)}

Poptávku potvrdíte nebo odmítnete v administraci:
${settings.publicUrl}/admin/bookings/${booking.id}

Termín je do vašeho rozhodnutí pro ostatní hosty blokovaný.
`,
  };
}

/**
 * Writes to the guest in their language. `message` is the owner's own note; it goes right after
 * the opening paragraph of a confirmation or cancellation.
 */
export function guestMail(
  booking: BookingView,
  apartments: Apartment[],
  notice: GuestNotice,
  message: string,
  settings: MailSettings,
): Mail {
  const english = booking.language === 'en';
  const language: Language = english ? 'en' : 'cs';
  const note = message.trim()
    ? `${english ? 'A message from us' : 'Zpráva od nás'}:\n${message.trim()}\n\n`
    : '';
  const stay = `${date(booking.check_in, language)} – ${date(booking.check_out, language)}`;
  const summary = english
    ? `Booking code: ${booking.code}\nDates: ${stay} (${booking.nights} nights)\nApartments: ${apartmentNames(apartments, 'en')}\nGuests: ${booking.guests}\nPrice: ${price(booking.total_price, 'en')}\n`
    : `Kód rezervace: ${booking.code}\nTermín: ${stay} (${booking.nights} nocí)\nApartmány: ${apartmentNames(apartments, 'cs')}\nPočet osob: ${booking.guests}\nCena: ${price(booking.total_price, 'cs')}\n`;
  const signature = `\nRychta Čenkovice\nČenkovice 106, 561 64 Čenkovice\n+420 606 734 911\n${settings.publicUrl}\n`;
  const greeting = english ? `Hello ${booking.name},\n\n` : 'Dobrý den,\n\n';

  const texts: Record<GuestNotice, Record<Language, [subject: string, text: string]>> = {
    received: {
      en: [
        `We have received your booking request ${booking.code}`,
        `thank you for your request. We are holding the dates for you and will confirm availability and the price as soon as we can. You do not pay anything yet.\n\n${summary}\nIf anything changes, just reply to this e-mail.\n`,
      ],
      cs: [
        `Přijali jsme vaši poptávku ${booking.code}`,
        `děkujeme za vaši poptávku. Termín pro vás držíme a co nejdříve vám potvrdíme volno a cenu. Zatím nic neplatíte.\n\n${summary}\nKdyby se cokoli změnilo, stačí odpovědět na tento e-mail.\n`,
      ],
    },
    confirmed: {
      en: [
        `Your booking ${booking.code} is confirmed`,
        `your stay at Rychta Čenkovice is confirmed. You will pick up the keys on the day of arrival; we will send the details before your stay.\n\n${note}${summary}`,
      ],
      cs: [
        `Vaše rezervace ${booking.code} je potvrzena`,
        `váš pobyt na Rychtě Čenkovice je potvrzen. Klíče si převezmete v den příjezdu, podrobnosti vám pošleme před pobytem.\n\n${note}${summary}`,
      ],
    },
    cancelled: {
      en: [
        `Your booking ${booking.code} was cancelled`,
        `your booking request below was cancelled. If this is a mistake or you would like other dates, reply to this e-mail or call us.\n\n${note}${summary}`,
      ],
      cs: [
        `Vaše rezervace ${booking.code} byla zrušena`,
        `níže uvedená rezervace byla zrušena. Pokud jde o omyl nebo byste chtěli jiný termín, odpovězte na tento e-mail nebo nám zavolejte.\n\n${note}${summary}`,
      ],
    },
  };
  const [subject, text] = texts[notice][language];
  return { to: booking.email, replyTo: settings.owner, subject, text: greeting + text + signature };
}
