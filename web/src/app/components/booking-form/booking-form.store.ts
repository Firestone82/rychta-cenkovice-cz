import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type { ParamMap } from '@angular/router';
import type { Apartment } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { type BookingRequest } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { addDays, isISO, nightsBetween, todayISO } from '@utils/dates.util';
import { fieldMessage, isEmail, isPhone } from '@utils/forms.util';

/**
 * State of the public booking form, shared by its steps. Availability is asked from the
 * API whenever the dates change; the server checks again when the request is sent.
 */
@Injectable()
export class BookingFormStore {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  private readonly t = this.i18n.t;

  readonly today = todayISO();
  readonly checkIn = signal('');
  readonly checkOut = signal('');
  readonly guests = signal(2);
  /** Ids of the ticked apartments. */
  readonly selected = signal<number[]>([]);
  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly note = signal('');
  readonly consent = signal(false);
  readonly website = signal('');
  readonly captchaToken = signal('');

  /** null while loading, empty when the API could not be reached. */
  readonly apartments = signal<Apartment[] | null>(null);
  /** Apartments taken in the chosen dates; null while unknown. */
  readonly taken = signal<number[] | null>(null);
  readonly checking = signal(false);
  readonly checkFailed = signal(false);
  /** Message per field, keyed by the API field name (`dates` covers both dates). */
  readonly errors = signal<Record<string, string>>({});

  readonly minCheckOut = computed(() =>
    isISO(this.checkIn()) ? addDays(this.checkIn(), 1) : addDays(this.today, 1),
  );
  readonly nights = computed(() =>
    isISO(this.checkIn()) && isISO(this.checkOut())
      ? nightsBetween(this.checkIn(), this.checkOut())
      : 0,
  );
  /** Why the dates cannot be used yet, or '' when they are fine. */
  readonly datesProblem = computed(() => {
    const b = this.t().booking;
    if (!isISO(this.checkIn()) || !isISO(this.checkOut())) return b.pickDates;
    if (this.checkIn() < this.today) return b.datesPast;
    if (this.nights() < 1) return b.datesInvalid;
    return '';
  });
  readonly datesOk = computed(() => this.datesProblem() === '');
  readonly chosen = computed(() =>
    (this.apartments() ?? []).filter((a) => this.selected().includes(a.id)),
  );
  readonly capacity = computed(() =>
    this.chosen().reduce((sum, a) => sum + a.beds + a.extra_beds, 0),
  );
  readonly capacityLow = computed(
    () => this.chosen().length > 0 && this.capacity() < this.guests(),
  );
  readonly noneFree = computed(() => {
    const list = this.apartments();
    const taken = this.taken();
    return !!list?.length && !!taken && list.every((a) => taken.includes(a.id));
  });
  readonly minNightsProblem = computed(() => {
    const need = Math.max(0, ...this.chosen().map((a) => a.min_nights));
    return this.nights() > 0 && this.nights() < need
      ? this.i18n.fill(this.t().booking.minNights, {
          n: this.i18n.count(need, this.t().plural.nights),
        })
      : '';
  });
  /** Known only when every chosen apartment has a nightly price. */
  readonly estimate = computed(() => {
    const list = this.chosen();
    if (!list.length || this.nights() < 1 || list.some((a) => a.price_per_night === null))
      return null;
    return list.reduce((sum, a) => sum + (a.price_per_night ?? 0) * this.nights(), 0);
  });

  constructor() {
    effect(() => this.checkAvailability(this.checkIn(), this.checkOut(), this.datesOk()));
  }

  /** Prefills the form from `?from&to&guests&a` and loads the apartments. */
  init(query: ParamMap): void {
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
        if (!match) return;
        this.selected.set([match.id]);
        if (!query.get('guests')) this.guests.set(Math.min(this.guests(), match.beds));
      },
      () => this.apartments.set([]),
    );
  }

  setCheckIn(value: string): void {
    this.checkIn.set(value);
    if (isISO(value) && (!isISO(this.checkOut()) || this.checkOut() <= value))
      this.checkOut.set(addDays(value, 2));
  }

  setGuests(value: string): void {
    this.guests.set(Math.max(1, Math.min(40, Math.floor(Number(value)) || 1)));
  }

  isTaken(apartment: Apartment): boolean {
    return this.taken()?.includes(apartment.id) ?? false;
  }

  toggle(apartment: Apartment, on: boolean): void {
    this.selected.update((list) =>
      on ? [...new Set([...list, apartment.id])] : list.filter((id) => id !== apartment.id),
    );
  }

  /** Somebody else booked these apartments while the form was being filled in. */
  markTaken(ids: number[]): void {
    this.taken.update((taken) => [...new Set([...(taken ?? []), ...ids])]);
    this.selected.update((list) => list.filter((id) => !ids.includes(id)));
  }

  /** Field error codes of the same checks the API runs, keyed by field. */
  validate(captchaNeeded: boolean): Record<string, string> {
    const codes: Record<string, string> = {};
    if (!this.datesOk()) codes['dates'] = 'required';
    if (!this.selected().length) codes['apartment_ids'] = 'required';
    else if (this.capacityLow()) codes['guests'] = 'over_capacity';
    if (this.minNightsProblem()) codes['dates'] = 'min_nights';
    if (!this.name().trim()) codes['name'] = 'required';
    if (!isEmail(this.email())) codes['email'] = 'invalid';
    if (!isPhone(this.phone())) codes['phone'] = 'invalid';
    if (this.note().length > 2000) codes['note'] = 'too_long';
    if (!this.consent()) codes['consent'] = 'required';
    if (captchaNeeded && !this.captchaToken()) codes['captcha'] = 'required';
    return codes;
  }

  showErrors(codes: Record<string, string>): void {
    const b = this.t().booking;
    const messages: Record<string, string> = {};
    for (const [field, code] of Object.entries(codes)) {
      if (field === 'dates')
        messages[field] =
          this.datesProblem() ||
          this.minNightsProblem() ||
          (code === 'in_past' ? b.datesPast : b.datesInvalid);
      else if (field === 'apartment_ids') messages[field] = b.summaryEmpty;
      else if (field === 'guests')
        messages[field] = this.i18n.fill(b.capacityLow, {
          n: this.i18n.count(this.capacity(), this.t().plural.beds),
        });
      else messages[field] = fieldMessage(this.t(), field, code);
    }
    this.errors.set(messages);
  }

  request(): BookingRequest {
    return {
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
    };
  }

  /** Clears the stay for another request; the contact details stay filled in. */
  startOver(): void {
    this.captchaToken.set('');
    this.selected.set([]);
    this.note.set('');
    this.errors.set({});
    this.checkIn.set('');
    this.checkOut.set('');
  }

  private checkAvailability(from: string, to: string, datesOk: boolean): void {
    if (!datesOk) {
      this.taken.set(null);
      this.checking.set(false);
      return;
    }
    const current = () => this.checkIn() === from && this.checkOut() === to;
    this.checking.set(true);
    this.checkFailed.set(false);
    this.api.checkAvailability(from, to).then(
      (ids) => {
        if (!current()) return;
        this.taken.set(ids);
        this.selected.update((list) => list.filter((id) => !ids.includes(id)));
        this.checking.set(false);
      },
      () => {
        if (!current()) return;
        this.taken.set(null);
        this.checkFailed.set(true);
        this.checking.set(false);
      },
    );
  }
}
