import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminBookingInput, Api, toFailure } from '../core/api';
import { addDays, isISO, nightsBetween, todayISO } from '../core/dates';
import { checkedOf, valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import type { Apartment, Booking, BookingKind, BookingStatus, Message } from '../core/models';
import { Seo } from '../core/seo';
import { Field } from '../ui/field';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';
import { unitNumbers } from './util';

/**
 * Creates or edits a booking by hand: a guest's stay (for example one agreed by phone
 * or taken from a contact-form message) or a block of dates.
 */
@Component({
  selector: 'rc-admin-booking-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Field, Icon, Spinner],
  template: `
    <a class="back" routerLink="/admin/bookings"
      ><rc-icon name="back" /> {{ t().admin.bookings.title }}</a
    >

    @if (ready()) {
      <div class="a-head">
        <div>
          <h1>{{ title() }}</h1>
          @if (booking(); as b) {
            <p>
              {{ t().admin.bookings.source[b.source] }},
              {{ t().admin.bookings.created_at.toLowerCase() }} {{ i18n.dateTime(b.created_at) }}
            </p>
          }
        </div>
      </div>

      @if (message(); as m) {
        <aside class="a-card msg">
          <h2>{{ i18n.fill(t().admin.bookings.fromMessage, { name: m.name }) }}</h2>
          <p class="body">{{ m.body }}</p>
          <p class="muted">{{ m.email }} {{ m.phone }}</p>
        </aside>
      }

      <form class="grid" (submit)="save($event)" novalidate>
        <div class="main">
          <section class="a-card">
            <div class="form-grid">
              <div class="field">
                <span class="label" id="bf-kind">{{ t().admin.bookings.kindLabel }}</span>
                <div class="a-seg" role="group" aria-labelledby="bf-kind">
                  <button
                    type="button"
                    [attr.aria-pressed]="kind() === 'guest'"
                    (click)="kind.set('guest')"
                  >
                    {{ t().admin.bookings.kind.guest }}
                  </button>
                  <button
                    type="button"
                    [attr.aria-pressed]="kind() === 'block'"
                    (click)="kind.set('block')"
                  >
                    {{ t().admin.bookings.kind.block }}
                  </button>
                </div>
              </div>
              @if (kind() === 'guest') {
                <rc-field for="bf-status" [label]="t().admin.bookings.statusLabel">
                  <select
                    id="bf-status"
                    class="input"
                    [value]="status()"
                    (change)="setStatus(value($event))"
                  >
                    @for (s of statuses; track s) {
                      <option [value]="s" [selected]="status() === s">
                        {{ t().admin.bookings.status[s] }}
                      </option>
                    }
                  </select>
                </rc-field>
              }
              <rc-field
                for="bf-in"
                [label]="t().admin.bookings.checkIn"
                [error]="errors()['check_in']"
              >
                <input
                  id="bf-in"
                  class="input"
                  type="date"
                  required
                  [value]="checkIn()"
                  (change)="setCheckIn(value($event))"
                  [attr.aria-invalid]="errors()['check_in'] ? 'true' : null"
                  aria-describedby="bf-in-msg"
                />
              </rc-field>
              <rc-field
                for="bf-out"
                [label]="t().admin.bookings.checkOut"
                [error]="errors()['check_out']"
                [hint]="nights() > 0 ? i18n.count(nights(), t().plural.nights) : null"
              >
                <input
                  id="bf-out"
                  class="input"
                  type="date"
                  required
                  [min]="checkIn() ? minOut() : null"
                  [value]="checkOut()"
                  (change)="checkOut.set(value($event))"
                  [attr.aria-invalid]="errors()['check_out'] ? 'true' : null"
                  aria-describedby="bf-out-msg"
                />
              </rc-field>
            </div>

            <fieldset class="units">
              <legend>{{ t().admin.bookings.units }}</legend>
              <ul>
                @for (a of apartments(); track a.id) {
                  <li>
                    <label
                      class="unit"
                      [class.is-on]="selected().includes(a.id)"
                      [class.is-taken]="taken().has(a.id)"
                    >
                      <input
                        type="checkbox"
                        [checked]="selected().includes(a.id)"
                        (change)="toggle(a.id, checked($event))"
                      />
                      <span class="num">{{ a.number }}</span>
                      <span class="unit-text">
                        {{ i18n.count(a.beds, t().plural.beds) }}
                        @if (taken().has(a.id)) {
                          <strong class="clash"
                            >{{ t().admin.bookings.unitTaken }}: {{ taken().get(a.id) }}</strong
                          >
                        }
                      </span>
                    </label>
                  </li>
                }
              </ul>
              @if (errors()['apartment_ids']) {
                <p class="error" role="alert">{{ errors()['apartment_ids'] }}</p>
              }
            </fieldset>
          </section>

          <section class="a-card">
            <div class="form-grid">
              <rc-field
                for="bf-name"
                [label]="
                  kind() === 'guest' ? t().admin.bookings.name : t().admin.bookings.blockName
                "
                [error]="errors()['name']"
                class="wide"
              >
                <input
                  id="bf-name"
                  class="input"
                  type="text"
                  [value]="name()"
                  (input)="name.set(value($event))"
                  [attr.aria-invalid]="errors()['name'] ? 'true' : null"
                  aria-describedby="bf-name-msg"
                />
              </rc-field>
              @if (kind() === 'guest') {
                <rc-field
                  for="bf-email"
                  [label]="t().admin.bookings.email"
                  [error]="errors()['email']"
                >
                  <input
                    id="bf-email"
                    class="input"
                    type="email"
                    [value]="email()"
                    (input)="email.set(value($event))"
                    [attr.aria-invalid]="errors()['email'] ? 'true' : null"
                    aria-describedby="bf-email-msg"
                  />
                </rc-field>
                <rc-field
                  for="bf-phone"
                  [label]="t().admin.bookings.phone"
                  [error]="errors()['phone']"
                >
                  <input
                    id="bf-phone"
                    class="input"
                    type="tel"
                    [value]="phone()"
                    (input)="phone.set(value($event))"
                    [attr.aria-invalid]="errors()['phone'] ? 'true' : null"
                    aria-describedby="bf-phone-msg"
                  />
                </rc-field>
                <rc-field
                  for="bf-guests"
                  [label]="t().admin.bookings.guests"
                  [error]="errors()['guests']"
                >
                  <input
                    id="bf-guests"
                    class="input"
                    type="number"
                    min="1"
                    max="200"
                    [value]="guests()"
                    (change)="guests.set(toNumber(value($event), 1))"
                    [attr.aria-invalid]="errors()['guests'] ? 'true' : null"
                    aria-describedby="bf-guests-msg"
                  />
                </rc-field>
                <rc-field for="bf-lang" [label]="t().admin.bookings.language">
                  <select
                    id="bf-lang"
                    class="input"
                    (change)="language.set(value($event) === 'en' ? 'en' : 'cs')"
                  >
                    <option value="cs" [selected]="language() === 'cs'">Česky</option>
                    <option value="en" [selected]="language() === 'en'">English</option>
                  </select>
                </rc-field>
                <rc-field
                  for="bf-note"
                  [label]="t().admin.bookings.note"
                  class="wide"
                  [error]="errors()['note']"
                >
                  <textarea
                    id="bf-note"
                    class="input"
                    rows="3"
                    [value]="note()"
                    (input)="note.set(value($event))"
                    aria-describedby="bf-note-msg"
                  ></textarea>
                </rc-field>
              }
              <rc-field for="bf-admin-note" [label]="t().admin.bookings.adminNote" class="wide">
                <textarea
                  id="bf-admin-note"
                  class="input"
                  rows="3"
                  [value]="adminNote()"
                  (input)="adminNote.set(value($event))"
                  aria-describedby="bf-admin-note-msg"
                ></textarea>
              </rc-field>
            </div>
          </section>
        </div>

        <aside class="side a-card">
          @if (kind() === 'guest') {
            <rc-field
              for="bf-price"
              [label]="t().admin.bookings.price"
              [hint]="t().admin.bookings.priceHint"
              [error]="errors()['total_price']"
            >
              <input
                id="bf-price"
                class="input"
                type="number"
                min="0"
                step="1"
                [value]="price()"
                [disabled]="autoPrice()"
                (input)="price.set(value($event))"
                aria-describedby="bf-price-msg"
              />
            </rc-field>
            <label class="check">
              <input
                type="checkbox"
                [checked]="autoPrice()"
                (change)="autoPrice.set(checked($event))"
              />
              <span>{{ t().admin.bookings.priceAuto }}</span>
            </label>
            <label class="check">
              <input type="checkbox" [checked]="notify()" (change)="notify.set(checked($event))" />
              <span>{{
                booking() ? t().admin.bookings.notify : t().admin.bookings.notifyCreate
              }}</span>
            </label>
          }

          @if (failure()) {
            <p class="notice is-error" role="alert">{{ failure() }}</p>
          }

          <button class="btn" type="submit" [disabled]="busy()">
            {{ busy() ? t().admin.bookings.saving : t().admin.bookings.save }}
          </button>

          @if (booking(); as b) {
            <div class="more">
              @if (b.status === 'pending') {
                <button
                  type="button"
                  class="btn btn-ghost"
                  [disabled]="busy()"
                  (click)="quick('confirmed')"
                >
                  <rc-icon name="check" /> {{ t().admin.bookings.confirm }}
                </button>
              }
              @if (b.status !== 'cancelled') {
                <button
                  type="button"
                  class="btn btn-quiet"
                  [disabled]="busy()"
                  (click)="quick('cancelled')"
                >
                  {{
                    b.status === 'pending' ? t().admin.bookings.decline : t().admin.bookings.cancel
                  }}
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-quiet"
                  [disabled]="busy()"
                  (click)="quick('confirmed')"
                >
                  {{ t().admin.bookings.reopen }}
                </button>
              }
              <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="remove()">
                <rc-icon name="trash" /> {{ t().admin.bookings.delete }}
              </button>
            </div>
            @if (b.message_id) {
              <a class="orig" routerLink="/admin/messages" [queryParams]="{ status: 'all' }">{{
                t().admin.bookings.messageLink
              }}</a>
            }
          }
        </aside>
      </form>
    } @else if (missing()) {
      <p class="notice is-error" role="alert">{{ t().common.loadFailed }}</p>
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .back {
      margin-bottom: 16px;
    }
    .msg {
      margin-bottom: 20px;
      border-left: 5px solid var(--larch);
    }
    .msg .body {
      white-space: pre-wrap;
      margin-bottom: 8px;
      max-width: 60em;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
      gap: 20px;
      align-items: start;
    }
    .main {
      display: grid;
      gap: 20px;
    }
    .units {
      margin: 22px 0 0;
      padding: 0;
      border: 0;
    }
    .units legend {
      padding: 0;
      margin-bottom: 8px;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .units ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 8px;
    }
    .unit {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 62px;
      padding: 8px 12px;
      border: 1.5px solid var(--edge);
      border-radius: var(--radius);
      cursor: pointer;
    }
    .unit:has(input:focus-visible) {
      outline: 3px solid var(--winter);
      outline-offset: 2px;
    }
    .unit.is-on {
      border-color: var(--timber);
      box-shadow: inset 0 0 0 1.5px var(--timber);
    }
    .unit.is-taken {
      background: var(--larch-soft);
    }
    .unit input {
      width: 22px;
      height: 22px;
      margin: 0;
      accent-color: var(--timber);
      outline: none;
    }
    .unit .num {
      font-size: 2.2rem;
      line-height: 0.8;
      color: var(--timber);
    }
    .unit-text {
      display: grid;
      font-size: 0.92rem;
      line-height: 1.25;
      color: var(--slate-2);
    }
    .clash {
      color: #6b4a05;
    }
    .error {
      margin-top: 8px;
      font-weight: 700;
      color: var(--timber);
    }
    .side {
      position: sticky;
      top: 20px;
      display: grid;
      gap: 16px;
    }
    .side .btn {
      width: 100%;
    }
    .more {
      display: grid;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
    }
    .orig {
      font-weight: 700;
    }
    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .side {
        position: static;
      }
    }
  `,
})
export class BookingFormPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  private readonly seo = inject(Seo);

  /** Route parameter; absent for a new booking. */
  readonly id = input<string>();

  protected readonly statuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled'];
  protected readonly booking = signal<Booking | null>(null);
  protected readonly message = signal<Message | null>(null);
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly ready = signal(false);
  protected readonly missing = signal(false);

  protected readonly kind = signal<BookingKind>('guest');
  protected readonly status = signal<BookingStatus>('confirmed');
  protected readonly checkIn = signal('');
  protected readonly checkOut = signal('');
  protected readonly selected = signal<number[]>([]);
  protected readonly guests = signal(2);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly language = signal<'cs' | 'en'>('cs');
  protected readonly note = signal('');
  protected readonly adminNote = signal('');
  protected readonly price = signal('');
  protected readonly autoPrice = signal(false);
  protected readonly notify = signal(false);

  /** Other active bookings in the chosen dates, by apartment id: who has it. */
  protected readonly taken = signal(new Map<number, string>());
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly busy = signal(false);
  protected readonly value = valueOf;
  protected readonly checked = checkedOf;

  protected readonly nights = computed(() =>
    isISO(this.checkIn()) && isISO(this.checkOut())
      ? nightsBetween(this.checkIn(), this.checkOut())
      : 0,
  );
  protected readonly minOut = computed(() =>
    isISO(this.checkIn()) ? addDays(this.checkIn(), 1) : '',
  );
  protected readonly title = computed(() => {
    const b = this.booking();
    return b
      ? this.i18n.fill(this.t().admin.bookings.formTitleEdit, { code: b.code })
      : this.kind() === 'block'
        ? this.t().admin.bookings.newBlock
        : this.t().admin.bookings.formTitleNew;
  });

  constructor() {
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    void this.init(
      query.get('kind'),
      query.get('from'),
      Number(query.get('a')),
      Number(query.get('message')),
    );
    effect(() => this.seo.noIndex(this.title()));

    // Show which apartments are already taken by someone else in the chosen dates.
    effect(() => {
      const from = this.checkIn();
      const to = this.checkOut();
      const own = this.booking()?.id;
      if (!isISO(from) || !isISO(to) || to <= from) {
        this.taken.set(new Map());
        return;
      }
      untracked(() =>
        this.api.adminBookings({ status: 'active', from, to }).then(
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

  private async init(
    kind: string | null,
    from: string | null,
    apartmentNumber: number,
    messageId: number,
  ): Promise<void> {
    try {
      this.apartments.set(await this.api.adminApartments());
      const id = Number(this.id());
      if (id) {
        this.fill(await this.api.adminBooking(id));
      } else {
        if (kind === 'block') this.kind.set('block');
        const start = isISO(from) ? from : '';
        if (start) {
          this.checkIn.set(start);
          this.checkOut.set(addDays(start, 2));
        }
        const apartment = this.apartments().find((a) => a.number === apartmentNumber);
        if (apartment) this.selected.set([apartment.id]);
        this.autoPrice.set(true);
        if (messageId) {
          const all = await this.api.messages('all');
          const m = all.find((item) => item.id === messageId);
          if (m) {
            this.message.set(m);
            this.name.set(m.name);
            this.email.set(m.email);
            this.phone.set(m.phone);
            this.language.set(m.language);
            this.notify.set(!!m.email);
          }
        }
      }
      this.ready.set(true);
    } catch {
      this.missing.set(true);
    }
  }

  private fill(b: Booking): void {
    this.booking.set(b);
    this.kind.set(b.kind);
    this.status.set(b.status);
    this.checkIn.set(b.check_in);
    this.checkOut.set(b.check_out);
    this.selected.set(b.apartment_ids);
    this.guests.set(b.guests || 1);
    this.name.set(b.name);
    this.email.set(b.email);
    this.phone.set(b.phone);
    this.language.set(b.language);
    this.note.set(b.note);
    this.adminNote.set(b.admin_note);
    this.price.set(b.total_price !== null ? String(b.total_price) : '');
    this.autoPrice.set(false);
    this.notify.set(false);
  }

  protected setStatus(value: string): void {
    if (value === 'pending' || value === 'confirmed' || value === 'cancelled')
      this.status.set(value);
  }

  protected setCheckIn(value: string): void {
    this.checkIn.set(value);
    if (isISO(value) && (!isISO(this.checkOut()) || this.checkOut() <= value))
      this.checkOut.set(addDays(value, 2));
  }

  protected toggle(id: number, on: boolean): void {
    this.selected.update((list) =>
      on ? [...new Set([...list, id])] : list.filter((x) => x !== id),
    );
  }

  protected toNumber(text: string, fallback: number): number {
    const n = Math.floor(Number(text));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  private body(): AdminBookingInput {
    const guest = this.kind() === 'guest';
    const body: AdminBookingInput = {
      kind: this.kind(),
      status: guest ? this.status() : this.status() === 'cancelled' ? 'cancelled' : 'confirmed',
      check_in: this.checkIn(),
      check_out: this.checkOut(),
      apartment_ids: this.selected(),
      name: this.name().trim(),
      admin_note: this.adminNote().trim(),
    };
    if (guest) {
      Object.assign(body, {
        guests: this.guests(),
        email: this.email().trim(),
        phone: this.phone().trim(),
        language: this.language(),
        note: this.note().trim(),
        notify: this.notify(),
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

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    const e = this.t().errors;
    const local: Record<string, string> = {};
    if (!isISO(this.checkIn())) local['check_in'] = e.required;
    if (!isISO(this.checkOut())) local['check_out'] = e.required;
    else if (isISO(this.checkIn()) && this.checkOut() <= this.checkIn())
      local['check_out'] = this.t().booking.datesInvalid;
    if (!this.selected().length) local['apartment_ids'] = this.t().booking.summaryEmpty;
    if (this.kind() === 'guest' && this.name().trim().length < 2) local['name'] = e.required;
    this.errors.set(local);
    if (Object.keys(local).length) {
      this.failure.set(this.t().booking.fixErrors);
      return;
    }
    await this.send(this.body(), true);
  }

  /** Confirms, declines, cancels or reopens the stored booking without touching other fields. */
  protected async quick(status: BookingStatus): Promise<void> {
    await this.send({ status, notify: this.booking()?.kind === 'guest' }, false);
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
        const messages: Record<string, string> = {};
        for (const [field, code] of Object.entries(failure.fields)) {
          messages[field] =
            code === 'before_check_in'
              ? this.t().booking.datesInvalid
              : field === 'email'
                ? e.invalid_email
                : field === 'phone'
                  ? e.invalid_phone
                  : code === 'too_long'
                    ? e.too_long
                    : e.required;
        }
        this.errors.set(messages);
        this.failure.set(this.t().booking.fixErrors);
      } else {
        this.failure.set(failure.status === 0 ? e.offline : this.t().admin.common.error);
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const b = this.booking();
    if (!b || !confirm(this.t().admin.bookings.deleteConfirm)) return;
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
}
