import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, BookingReceipt, toFailure } from '../../core/api';
import { addDays, isISO, nightsBetween, todayISO } from '../../core/dates';
import { checkedOf, fieldMessage, isEmail, isPhone, valueOf } from '../../core/forms';
import { I18n } from '../../core/i18n/i18n';
import { Links } from '../../core/links';
import type { Apartment } from '../../core/models';
import { Seo } from '../../core/seo';
import { Captcha } from '../../ui/captcha';
import { Field } from '../../ui/field';
import { Spinner } from '../../ui/spinner';

/**
 * Booking request in three parts: dates, apartments, contact details. Availability is
 * checked against the API as soon as the dates are known; the server checks again and
 * holds the dates when the request is sent.
 */
@Component({
  selector: 'rc-booking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Field, Spinner, Captcha],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class BookingPage {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);

  protected readonly today = todayISO();
  protected readonly checkIn = signal('');
  protected readonly checkOut = signal('');
  protected readonly guests = signal(2);
  protected readonly selected = signal<number[]>([]);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly note = signal('');
  protected readonly consent = signal(false);
  protected readonly website = signal('');
  protected readonly captchaToken = signal('');
  private readonly captcha = viewChild(Captcha);

  protected readonly apartments = signal<Apartment[] | null>(null);
  /** Apartments taken in the chosen dates; null while unknown. */
  protected readonly taken = signal<number[] | null>(null);
  protected readonly checking = signal(false);
  protected readonly checkFailed = signal(false);

  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly sending = signal(false);
  protected readonly receipt = signal<BookingReceipt | null>(null);
  protected readonly sentTo = signal('');
  protected readonly value = valueOf;
  protected readonly checked = checkedOf;

  private readonly done = viewChild<ElementRef<HTMLElement>>('done');
  private readonly form = viewChild<ElementRef<HTMLFormElement>>('form');

  protected readonly minCheckOut = computed(() =>
    isISO(this.checkIn()) ? addDays(this.checkIn(), 1) : addDays(this.today, 1),
  );
  protected readonly nights = computed(() =>
    isISO(this.checkIn()) && isISO(this.checkOut())
      ? nightsBetween(this.checkIn(), this.checkOut())
      : 0,
  );

  /** Why the dates cannot be used yet, or '' when they are fine. */
  protected readonly datesProblem = computed(() => {
    const b = this.t().booking;
    if (!isISO(this.checkIn()) || !isISO(this.checkOut())) return b.pickDates;
    if (this.checkIn() < this.today) return b.datesPast;
    if (this.nights() < 1) return b.datesInvalid;
    return '';
  });
  protected readonly datesOk = computed(() => this.datesProblem() === '');

  protected readonly chosen = computed(() =>
    (this.apartments() ?? []).filter((a) => this.selected().includes(a.id)),
  );
  protected readonly capacity = computed(() =>
    this.chosen().reduce((sum, a) => sum + a.beds + a.extra_beds, 0),
  );
  protected readonly capacityLow = computed(
    () => this.chosen().length > 0 && this.capacity() < this.guests(),
  );
  protected readonly noneFree = computed(() => {
    const list = this.apartments();
    const taken = this.taken();
    return !!list?.length && !!taken && list.every((a) => taken.includes(a.id));
  });
  protected readonly minNightsProblem = computed(() => {
    const need = Math.max(0, ...this.chosen().map((a) => a.min_nights));
    return this.nights() > 0 && this.nights() < need
      ? this.i18n.fill(this.t().booking.minNights, {
          n: this.i18n.count(need, this.t().plural.nights),
        })
      : '';
  });
  /** Estimated price, known only when every chosen apartment has a nightly price. */
  protected readonly estimate = computed(() => {
    const list = this.chosen();
    if (!list.length || this.nights() < 1 || list.some((a) => a.price_per_night === null))
      return null;
    return list.reduce((sum, a) => sum + (a.price_per_night ?? 0) * this.nights(), 0);
  });

  constructor() {
    inject(Seo).page(this.t().booking.title, this.t().booking.lead);
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const from = query.get('from');
    const to = query.get('to');
    if (isISO(from) && from >= this.today) {
      this.checkIn.set(from);
      this.checkOut.set(isISO(to) && to > from ? to : addDays(from, 2));
    }
    const guests = Number(query.get('guests'));
    if (guests >= 1 && guests <= 40) this.guests.set(Math.floor(guests));
    const wanted = Number(query.get('a'));

    this.api.apartments().then(
      (list) => {
        this.apartments.set(list);
        const match = list.find((a) => a.number === wanted);
        if (match) {
          this.selected.set([match.id]);
          if (!query.get('guests')) this.guests.set(Math.min(this.guests(), match.beds));
        }
      },
      () => this.apartments.set([]),
    );

    // Ask the API which apartments are free whenever the dates change.
    effect(() => {
      const from = this.checkIn();
      const to = this.checkOut();
      if (!this.datesOk()) {
        this.taken.set(null);
        this.checking.set(false);
        return;
      }
      this.checking.set(true);
      this.checkFailed.set(false);
      this.api.checkAvailability(from, to).then(
        (ids) => {
          if (this.checkIn() !== from || this.checkOut() !== to) return;
          this.taken.set(ids);
          this.selected.update((list) => list.filter((id) => !ids.includes(id)));
          this.checking.set(false);
        },
        () => {
          if (this.checkIn() !== from || this.checkOut() !== to) return;
          this.taken.set(null);
          this.checkFailed.set(true);
          this.checking.set(false);
        },
      );
    });
  }

  protected setCheckIn(value: string): void {
    this.checkIn.set(value);
    if (isISO(value) && (!isISO(this.checkOut()) || this.checkOut() <= value))
      this.checkOut.set(addDays(value, 2));
  }

  protected setGuests(event: Event): void {
    this.guests.set(Math.max(1, Math.min(40, Math.floor(Number(valueOf(event))) || 1)));
  }

  protected isTaken(a: Apartment): boolean {
    return this.taken()?.includes(a.id) ?? false;
  }

  protected toggle(a: Apartment, on: boolean): void {
    this.selected.update((list) =>
      on ? [...new Set([...list, a.id])] : list.filter((id) => id !== a.id),
    );
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    const codes: Record<string, string> = {};
    if (!this.datesOk()) codes['dates'] = 'required';
    if (!this.selected().length) codes['apartment_ids'] = 'required';
    else if (this.capacityLow()) codes['guests'] = 'over_capacity';
    if (this.minNightsProblem()) codes['dates'] = 'min_nights';
    if (this.name().trim().length < 2) codes['name'] = 'required';
    if (!isEmail(this.email())) codes['email'] = 'invalid';
    if (!isPhone(this.phone())) codes['phone'] = 'invalid';
    if (this.note().length > 2000) codes['note'] = 'too_long';
    if (!this.consent()) codes['consent'] = 'required';
    if (this.captcha()?.needed() && !this.captchaToken()) codes['captcha'] = 'required';
    if (this.show(codes)) return;

    this.sending.set(true);
    this.failure.set('');
    try {
      const receipt = await this.api.requestBooking({
        apartment_ids: this.selected(),
        check_in: this.checkIn(),
        check_out: this.checkOut(),
        guests: this.guests(),
        name: this.name().trim(),
        email: this.email().trim(),
        phone: this.phone().trim(),
        note: this.note().trim(),
        consent: true,
        language: this.i18n.lang(),
        website: this.website(),
        captcha_token: this.captchaToken() || undefined,
      });
      this.sentTo.set(this.email().trim());
      this.receipt.set(receipt);
      setTimeout(() => {
        window.scrollTo({ top: 0 });
        this.done()?.nativeElement.focus();
      });
    } catch (err) {
      const failure = toFailure(err);
      const e = this.t().errors;
      // The server checks an answer once. Unless it stopped earlier, a new one is needed.
      const spent =
        failure.code === 'validation'
          ? 'captcha' in failure.fields
          : failure.status >= 400 && failure.status !== 429;
      if (spent) this.captcha()?.reset();
      if (failure.status === 409) {
        this.taken.update((ids) => [...new Set([...(ids ?? []), ...failure.apartmentIds])]);
        this.selected.update((list) => list.filter((id) => !failure.apartmentIds.includes(id)));
        this.failure.set(this.t().booking.conflict);
        this.focusFirst('#units');
      } else if (failure.code === 'validation') {
        const fields: Record<string, string> = {};
        for (const [field, code] of Object.entries(failure.fields))
          fields[field === 'check_in' || field === 'check_out' ? 'dates' : field] = code;
        if (!this.show(fields)) this.failure.set(e.generic);
      } else {
        this.failure.set(
          failure.status === 429
            ? e.rate_limited
            : failure.status === 0
              ? e.offline
              : failure.code === 'captcha_unavailable'
                ? e.captcha_unavailable
                : e.generic,
        );
      }
    } finally {
      this.sending.set(false);
    }
  }

  /** Shows the problems next to their fields and focuses the first one. Returns true when there are any. */
  private show(codes: Record<string, string>): boolean {
    const b = this.t().booking;
    const messages: Record<string, string> = {};
    for (const [field, code] of Object.entries(codes)) {
      messages[field] =
        field === 'dates'
          ? this.datesProblem() ||
            this.minNightsProblem() ||
            (code === 'in_past' ? b.datesPast : b.datesInvalid)
          : field === 'apartment_ids'
            ? b.summaryEmpty
            : field === 'guests'
              ? this.i18n.fill(b.capacityLow, {
                  n: this.i18n.count(this.capacity(), this.t().plural.beds),
                })
              : fieldMessage(this.t(), field, code);
    }
    this.errors.set(messages);
    const first = Object.keys(codes)[0];
    if (!first) return false;
    this.failure.set(b.fixErrors);
    this.focusFirst(
      first === 'dates'
        ? '#b-in'
        : first === 'apartment_ids' || first === 'guests'
          ? '#units input:not(:disabled)'
          : '[aria-invalid="true"], [data-invalid]',
    );
    return true;
  }

  private focusFirst(selector: string): void {
    setTimeout(() => this.form()?.nativeElement.querySelector<HTMLElement>(selector)?.focus());
  }

  protected again(): void {
    this.captchaToken.set('');
    this.receipt.set(null);
    this.selected.set([]);
    this.note.set('');
    this.errors.set({});
    this.failure.set('');
    this.checkIn.set('');
    this.checkOut.set('');
  }
}
