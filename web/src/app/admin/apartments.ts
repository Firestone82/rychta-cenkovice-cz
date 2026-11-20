import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Api, toFailure } from '../core/api';
import { checkedOf, valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import type { Apartment } from '../core/models';
import { Seo } from '../core/seo';
import { Field } from '../ui/field';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';

/** Editable details of one apartment, folded until opened. */
@Component({
  selector: 'rc-apartment-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field],
  template: `
    <details class="a-card">
      <summary>
        <span class="num">{{ apartment().number }}</span>
        <span class="sum-text">
          <strong>{{ t().common.apartment }} {{ apartment().number }}</strong>
          <span
            >{{ apartment().area }} {{ t().common.areaUnit }},
            {{ i18n.count(apartment().beds, t().plural.beds) }}</span
          >
        </span>
        @if (!apartment().active) {
          <span class="tag">{{ t().admin.apartments.hidden }}</span>
        }
        <span class="sum-price">
          @if (apartment().price_per_night !== null) {
            {{ i18n.money(apartment().price_per_night!) }} {{ t().common.perNight }}
          } @else {
            {{ t().common.priceOnRequest }}
          }
        </span>
      </summary>

      <form (submit)="save($event)" novalidate>
        <div class="row4">
          <rc-field
            [for]="id('price')"
            [label]="t().admin.apartments.price"
            [hint]="t().admin.apartments.priceHint"
            [error]="errors()['price_per_night']"
          >
            <input
              [id]="id('price')"
              class="input"
              type="number"
              min="0"
              step="1"
              [value]="price()"
              (input)="price.set(value($event))"
              [attr.aria-describedby]="id('price') + '-msg'"
            />
          </rc-field>
          <rc-field
            [for]="id('min')"
            [label]="t().admin.apartments.minNights"
            [error]="errors()['min_nights']"
          >
            <input
              [id]="id('min')"
              class="input"
              type="number"
              min="1"
              max="30"
              [value]="minNights()"
              (input)="minNights.set(value($event))"
              [attr.aria-describedby]="id('min') + '-msg'"
            />
          </rc-field>
          <rc-field
            [for]="id('beds')"
            [label]="t().admin.apartments.beds"
            [error]="errors()['beds']"
          >
            <input
              [id]="id('beds')"
              class="input"
              type="number"
              min="1"
              max="40"
              [value]="beds()"
              (input)="beds.set(value($event))"
              [attr.aria-describedby]="id('beds') + '-msg'"
            />
          </rc-field>
          <rc-field
            [for]="id('extra')"
            [label]="t().admin.apartments.extraBeds"
            [error]="errors()['extra_beds']"
          >
            <input
              [id]="id('extra')"
              class="input"
              type="number"
              min="0"
              max="20"
              [value]="extraBeds()"
              (input)="extraBeds.set(value($event))"
              [attr.aria-describedby]="id('extra') + '-msg'"
            />
          </rc-field>
          <rc-field
            [for]="id('area')"
            [label]="t().admin.apartments.area"
            [error]="errors()['area']"
          >
            <input
              [id]="id('area')"
              class="input"
              type="number"
              min="1"
              max="1000"
              [value]="area()"
              (input)="area.set(value($event))"
              [attr.aria-describedby]="id('area') + '-msg'"
            />
          </rc-field>
        </div>

        <div class="checks">
          <label class="check"
            ><input
              type="checkbox"
              [checked]="active()"
              (change)="active.set(checked($event))"
            /><span>{{ t().admin.apartments.active }}</span></label
          >
          <label class="check"
            ><input
              type="checkbox"
              [checked]="accessible()"
              (change)="accessible.set(checked($event))"
            /><span>{{ t().admin.apartments.accessible }}</span></label
          >
        </div>

        <div class="langs">
          @for (l of langs; track l) {
            <fieldset>
              <legend>{{ l === 'cs' ? 'Česky' : 'English' }}</legend>
              <rc-field [for]="id('type-' + l)" [label]="t().admin.apartments.type">
                <input
                  [id]="id('type-' + l)"
                  class="input"
                  type="text"
                  [attr.lang]="l"
                  [value]="type()[l]"
                  (input)="patch(type, l, value($event))"
                  [attr.aria-describedby]="id('type-' + l) + '-msg'"
                />
              </rc-field>
              <rc-field [for]="id('layout-' + l)" [label]="t().admin.apartments.layout">
                <textarea
                  [id]="id('layout-' + l)"
                  class="input small"
                  rows="3"
                  [attr.lang]="l"
                  [value]="layout()[l]"
                  (input)="patch(layout, l, value($event))"
                  [attr.aria-describedby]="id('layout-' + l) + '-msg'"
                ></textarea>
              </rc-field>
              <rc-field [for]="id('features-' + l)" [label]="t().admin.apartments.features">
                <textarea
                  [id]="id('features-' + l)"
                  class="input"
                  rows="7"
                  [attr.lang]="l"
                  [value]="features()[l]"
                  (input)="patch(features, l, value($event))"
                  [attr.aria-describedby]="id('features-' + l) + '-msg'"
                ></textarea>
              </rc-field>
              <rc-field [for]="id('note-' + l)" [label]="t().admin.apartments.note">
                <textarea
                  [id]="id('note-' + l)"
                  class="input small"
                  rows="2"
                  [attr.lang]="l"
                  [value]="note()[l]"
                  (input)="patch(note, l, value($event))"
                  [attr.aria-describedby]="id('note-' + l) + '-msg'"
                ></textarea>
              </rc-field>
            </fieldset>
          }
        </div>

        @if (failure()) {
          <p class="notice is-error" role="alert">{{ failure() }}</p>
        }
        <button class="btn" type="submit" [disabled]="busy()">
          {{ t().admin.apartments.save }}
        </button>
      </form>
    </details>
  `,
  styles: `
    :host {
      display: block;
    }
    details {
      padding: 0;
    }
    summary {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 20px;
      cursor: pointer;
      list-style: none;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: '';
      width: 10px;
      height: 10px;
      margin-left: 8px;
      border-right: 2px solid var(--slate);
      border-bottom: 2px solid var(--slate);
      rotate: 45deg;
      transition: rotate 0.2s;
    }
    details[open] summary::after {
      rotate: -135deg;
    }
    summary .num {
      font-size: 3rem;
      line-height: 0.8;
      color: var(--timber);
    }
    .sum-text {
      display: grid;
      line-height: 1.3;
      color: var(--slate-2);
    }
    .sum-text strong {
      color: var(--slate);
    }
    .sum-price {
      margin-left: auto;
      font-weight: 700;
    }
    form {
      display: grid;
      gap: 20px;
      justify-items: start;
      padding: 8px 20px 24px;
      border-top: 1px solid var(--line);
    }
    .row4 {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 14px;
      width: 100%;
      margin-top: 14px;
    }
    .checks {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 28px;
    }
    .langs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
      gap: 20px;
      width: 100%;
    }
    fieldset {
      display: grid;
      gap: 14px;
      margin: 0;
      padding: 14px 16px 16px;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      min-width: 0;
    }
    legend {
      padding: 0 6px;
      font-weight: 700;
    }
    textarea.small {
      min-height: 0;
    }
  `,
})
export class ApartmentEditor {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  readonly apartment = input.required<Apartment>();
  readonly saved = output<Apartment>();

  protected readonly langs = ['cs', 'en'] as const;
  protected readonly price = signal('');
  protected readonly minNights = signal('1');
  protected readonly beds = signal('');
  protected readonly extraBeds = signal('');
  protected readonly area = signal('');
  protected readonly active = signal(true);
  protected readonly accessible = signal(false);
  protected readonly type = signal({ cs: '', en: '' });
  protected readonly layout = signal({ cs: '', en: '' });
  protected readonly features = signal({ cs: '', en: '' });
  protected readonly note = signal({ cs: '', en: '' });
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly busy = signal(false);
  protected readonly value = valueOf;
  protected readonly checked = checkedOf;

  ngOnInit(): void {
    const a = this.apartment();
    this.price.set(a.price_per_night !== null ? String(a.price_per_night) : '');
    this.minNights.set(String(a.min_nights));
    this.beds.set(String(a.beds));
    this.extraBeds.set(String(a.extra_beds));
    this.area.set(String(a.area));
    this.active.set(a.active);
    this.accessible.set(a.accessible);
    this.type.set({ ...a.type });
    this.layout.set({ ...a.layout });
    this.features.set({ cs: a.features.cs.join('\n'), en: a.features.en.join('\n') });
    this.note.set({ ...a.note });
  }

  protected id(name: string): string {
    return `ap${this.apartment().id}-${name}`;
  }

  protected patch(
    target: { update(fn: (v: { cs: string; en: string }) => { cs: string; en: string }): void },
    lang: 'cs' | 'en',
    text: string,
  ): void {
    target.update((v) => ({ ...v, [lang]: text }));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    const lines = (text: string) =>
      text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    const body: Record<string, unknown> = {
      min_nights: Number(this.minNights()) || 1,
      beds: Number(this.beds()),
      extra_beds: Number(this.extraBeds()) || 0,
      area: Number(this.area()),
      active: this.active(),
      accessible: this.accessible(),
      type: this.type(),
      layout: this.layout(),
      features: { cs: lines(this.features().cs), en: lines(this.features().en) },
      note: this.note(),
    };
    if (this.price().trim() === '') body['clear_price'] = true;
    else body['price_per_night'] = Math.max(0, Math.round(Number(this.price())));

    this.busy.set(true);
    this.failure.set('');
    this.errors.set({});
    try {
      const saved = await this.api.updateApartment(this.apartment().id, body);
      this.toasts.show(this.t().admin.apartments.saved);
      this.saved.emit(saved);
    } catch (err) {
      const failure = toFailure(err);
      if (failure.code === 'validation') {
        const messages: Record<string, string> = {};
        for (const field of Object.keys(failure.fields)) messages[field] = this.t().errors.required;
        this.errors.set(messages);
        this.failure.set(this.t().booking.fixErrors);
      } else {
        this.failure.set(this.t().admin.common.error);
      }
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'rc-admin-apartments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApartmentEditor, Spinner],
  template: `
    <div class="a-head">
      <div>
        <h1>{{ t().admin.apartments.title }}</h1>
        <p>{{ t().admin.apartments.lead }}</p>
      </div>
    </div>
    @if (items(); as list) {
      @if (list.length) {
        <div class="list">
          @for (a of list; track a.id) {
            <rc-apartment-editor [apartment]="a" (saved)="replace($event)" />
          }
        </div>
      } @else {
        <p class="a-empty">{{ t().common.loadFailed }}</p>
      }
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .list {
      display: grid;
      gap: 10px;
    }
  `,
})
export class ApartmentsPage {
  protected readonly t = inject(I18n).t;
  protected readonly items = signal<Apartment[] | null>(null);

  constructor() {
    inject(Seo).noIndex(this.t().admin.apartments.title);
    inject(Api)
      .adminApartments()
      .then(
        (list) => this.items.set(list),
        () => this.items.set([]),
      );
  }

  protected replace(saved: Apartment): void {
    this.items.update((list) =>
      (list ?? []).map((a) => (a.id === saved.id ? { ...a, ...saved } : a)),
    );
  }
}
