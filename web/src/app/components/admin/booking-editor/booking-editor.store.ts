import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { type ParamMap, Router } from '@angular/router';
import type { Apartment, Booking, BookingKind, BookingStatus, Message } from '@models/api.model';
import { type AdminBookingInput } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { AuthService } from '@services/auth.service';
import { toFailure } from '@utils/api-failure.util';
import { I18nService } from '@services/i18n.service';
import { ConfirmService } from '@services/confirm.service';
import { ToastService } from '@services/toast.service';
import { unitNumbers } from '@utils/booking.util';
import { addDays, isISO, nightsBetween } from '@utils/dates.util';

/** State of the admin booking editor; provided by the page so every part of the form shares it. */
@Injectable()
export class BookingEditorStore {
  readonly booking = signal<Booking | null>(null);
  /** The account only reads: the form shows the booking and nothing can be changed. */
  readonly readOnly = computed(() => !this.auth.canEdit());
  /** Contact-form message the new booking is created from. */
  readonly message = signal<Message | null>(null);
  readonly apartments = signal<Apartment[]>([]);
  readonly ready = signal(false);
  readonly missing = signal(false);

  readonly kind = signal<BookingKind>('guest');
  readonly status = signal<BookingStatus>('confirmed');
  readonly checkIn = signal('');
  readonly checkOut = signal('');
  readonly selected = signal<number[]>([]);
  readonly guests = signal('2');
  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');
  readonly language = signal<'cs' | 'en'>('cs');
  readonly note = signal('');
  readonly adminNote = signal('');
  readonly price = signal('');
  readonly autoPrice = signal(false);
  readonly notify = signal(false);
  readonly guestMessage = signal('');

  /** Other active bookings in the chosen dates: apartment id to the name of who has it. */
  readonly taken = signal(new Map<number, string>());
  readonly errors = signal<Record<string, string>>({});
  readonly failure = signal('');
  readonly busy = signal(false);

  readonly nights = computed(() =>
    isISO(this.checkIn()) && isISO(this.checkOut())
      ? nightsBetween(this.checkIn(), this.checkOut())
      : 0,
  );
  readonly minOut = computed(() => (isISO(this.checkIn()) ? addDays(this.checkIn(), 1) : null));
  readonly title = computed(() => {
    const b = this.booking();
    const text = this.t().admin.bookings;
    if (b) return this.i18n.fill(text.formTitleEdit, { code: b.code });
    return this.kind() === 'block' ? text.newBlock : text.formTitleNew;
  });

  private readonly i18n = inject(I18nService);
  private readonly t = this.i18n.t;
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  constructor() {
    effect(() => {
      const from = this.checkIn();
      const to = this.checkOut();
      const own = this.booking()?.id;
      if (!isISO(from) || !isISO(to) || to <= from) {
        this.taken.set(new Map());
        return;
      }
      untracked(() =>
        this.api.bookings({ status: 'active', from, to }).then(
          (list) => {
            if (this.checkIn() !== from || this.checkOut() !== to) return;
            const map = new Map<number, string>();
            for (const b of list) {
              if (b.id === own) continue;
              for (const id of b.apartment_ids) map.set(id, b.name || b.code);
            }
            this.taken.set(map);
          },
          () => undefined,
        ),
      );
    });
  }

  /**
   * Loads the booking `id`, or prepares a new one from the query: `kind=block`, `from` (arrival),
   * `a` (apartment number) and `message` (id of a contact-form message to take the guest from).
   */
  async init(id: number, query: ParamMap): Promise<void> {
    try {
      this.apartments.set(await this.api.apartments());
      if (id) this.fill(await this.api.booking(id));
      else await this.prepare(query);
      this.ready.set(true);
    } catch {
      this.missing.set(true);
    }
  }

  setCheckIn(value: string): void {
    this.checkIn.set(value);
    if (isISO(value) && (!isISO(this.checkOut()) || this.checkOut() <= value))
      this.checkOut.set(addDays(value, 2));
  }

  toggle(id: number, on: boolean): void {
    this.selected.update((list) =>
      on ? [...new Set([...list, id])] : list.filter((x) => x !== id),
    );
  }

  async save(): Promise<void> {
    if (this.busy()) return;
    const problems = this.validate();
    this.errors.set(problems);
    if (Object.keys(problems).length) this.failure.set(this.t().booking.fixErrors);
    else await this.send(this.body(), true);
  }

  /** Confirms, declines, cancels or reopens the stored booking without touching other fields. */
  async quick(status: BookingStatus): Promise<void> {
    const guest = this.booking()?.kind === 'guest';
    await this.send(
      { status, notify: guest, guest_message: guest ? this.guestMessage().trim() : '' },
      false,
    );
  }

  async remove(): Promise<void> {
    const b = this.booking();
    const text = this.t().admin.bookings;
    if (!b || !(await this.confirm.ask(text.deleteConfirm, text.delete))) return;
    this.busy.set(true);
    try {
      await this.api.deleteBooking(b.id);
      this.toasts.show(this.t().admin.bookings.deleted);
      await this.router.navigate(['/admin/bookings']);
    } catch {
      this.failure.set(this.t().admin.common.error);
    } finally {
      this.busy.set(false);
    }
  }

  private async prepare(query: ParamMap): Promise<void> {
    if (query.get('kind') === 'block') this.kind.set('block');
    const from = query.get('from');
    if (isISO(from)) {
      const to = query.get('to');
      this.checkIn.set(from);
      this.checkOut.set(isISO(to) && to > from ? to : addDays(from, 2));
    }
    const apartment = this.apartments().find((a) => a.number === Number(query.get('a')));
    if (apartment) this.selected.set([apartment.id]);
    this.autoPrice.set(true);

    const messageId = Number(query.get('message'));
    const m = messageId && (await this.api.messages('all')).find((item) => item.id === messageId);
    if (!m) return;
    this.message.set(m);
    this.name.set(m.name);
    this.email.set(m.email);
    this.phone.set(m.phone);
    this.language.set(m.language);
    this.notify.set(!!m.email);
  }

  private fill(b: Booking): void {
    this.booking.set(b);
    this.kind.set(b.kind);
    this.status.set(b.status);
    this.checkIn.set(b.check_in);
    this.checkOut.set(b.check_out);
    this.selected.set(b.apartment_ids);
    this.guests.set(String(b.guests || 1));
    this.name.set(b.name);
    this.email.set(b.email);
    this.phone.set(b.phone);
    this.language.set(b.language);
    this.note.set(b.note);
    this.adminNote.set(b.admin_note);
    this.price.set(b.total_price !== null ? String(b.total_price) : '');
    this.autoPrice.set(false);
    this.notify.set(false);
    this.guestMessage.set('');
  }

  private validate(): Record<string, string> {
    const required = this.t().errors.required;
    const problems: Record<string, string> = {};
    if (!isISO(this.checkIn())) problems['check_in'] = required;
    if (!isISO(this.checkOut())) problems['check_out'] = required;
    else if (isISO(this.checkIn()) && this.checkOut() <= this.checkIn())
      problems['check_out'] = this.t().booking.datesInvalid;
    if (!this.selected().length) problems['apartment_ids'] = this.t().booking.summaryEmpty;
    if (this.kind() === 'guest' && !this.name().trim()) problems['name'] = required;
    return problems;
  }

  private body(): AdminBookingInput {
    const guest = this.kind() === 'guest';
    const body: AdminBookingInput = {
      kind: this.kind(),
      status: guest || this.status() === 'cancelled' ? this.status() : 'confirmed',
      check_in: this.checkIn(),
      check_out: this.checkOut(),
      apartment_ids: this.selected(),
      name: this.name().trim(),
      admin_note: this.adminNote().trim(),
    };
    if (guest) {
      const guests = Math.floor(Number(this.guests()));
      Object.assign(body, {
        guests: Number.isFinite(guests) && guests > 0 ? guests : 1,
        email: this.email().trim(),
        phone: this.phone().trim(),
        language: this.language(),
        note: this.note().trim(),
        notify: this.notify(),
        guest_message: this.notify() ? this.guestMessage().trim() : '',
      });
      if (this.autoPrice()) body.auto_price = true;
      else if (this.price().trim() === '') body.clear_price = true;
      else body.total_price = Math.max(0, Math.round(Number(this.price())));
    } else {
      body.clear_price = true;
    }
    const message = this.message();
    if (message && !this.booking()) body.message_id = message.id;
    return body;
  }

  private async send(body: AdminBookingInput, leave: boolean): Promise<void> {
    this.busy.set(true);
    this.failure.set('');
    const existing = this.booking();
    try {
      const saved = existing
        ? await this.api.updateBooking(existing.id, body)
        : await this.api.createBooking(body);
      this.toasts.show(existing ? this.t().admin.bookings.saved : this.t().admin.bookings.created);
      if (leave || !existing) await this.router.navigate(['/admin/bookings']);
      else this.fill(saved);
    } catch (err) {
      this.explain(err);
    } finally {
      this.busy.set(false);
    }
  }

  private explain(err: unknown): void {
    const failure = toFailure(err);
    const e = this.t().errors;
    if (failure.status === 409) {
      const units = unitNumbers({ apartment_ids: failure.apartmentIds }, this.apartments());
      this.failure.set(
        this.i18n.fill(this.t().admin.bookings.conflict, {
          units: `${this.t().common.apartment} ${units}`,
        }),
      );
    } else if (failure.code === 'validation') {
      const message = (field: string, code: string): string => {
        if (code === 'before_check_in') return this.t().booking.datesInvalid;
        if (field === 'email') return e.invalid_email;
        if (field === 'phone') return e.invalid_phone;
        return code === 'too_long' ? e.too_long : e.required;
      };
      this.errors.set(
        Object.fromEntries(Object.entries(failure.fields).map(([f, c]) => [f, message(f, c)])),
      );
      this.failure.set(this.t().booking.fixErrors);
    } else {
      this.failure.set(failure.status === 0 ? e.offline : this.t().admin.common.error);
    }
  }
}
