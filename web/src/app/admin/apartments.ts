import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Api, toFailure } from '../core/api';
import {
  AMENITIES,
  FLAT_TYPES,
  FLOORS,
  LABEL_PRESETS,
  type Amenity,
} from '../core/apartment-options';
import { checkedOf, valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import type { Apartment, L10n } from '../core/models';
import { Seo } from '../core/seo';
import { Field } from '../ui/field';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';

/** Editable details of one apartment, folded until opened. */
@Component({
  selector: 'rc-apartment-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field, Icon],
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
            [for]="id('flat')"
            [label]="t().admin.apartments.type"
            [error]="errors()['flat_type']"
          >
            <select
              [id]="id('flat')"
              class="input"
              (change)="flatType.set(value($event))"
              [attr.aria-describedby]="id('flat') + '-msg'"
            >
              <option value="" [selected]="flatType() === ''">
                {{ t().admin.apartments.typeNone }}
              </option>
              @for (key of flatTypes; track key) {
                <option [value]="key" [selected]="flatType() === key">
                  {{ key === 'studio' ? t().flatTypes[key] : key }}
                </option>
              }
            </select>
          </rc-field>
          <rc-field
            [for]="id('floor')"
            [label]="t().admin.apartments.floor"
            [error]="errors()['floor']"
          >
            <select
              [id]="id('floor')"
              class="input"
              (change)="floor.set(value($event))"
              [attr.aria-describedby]="id('floor') + '-msg'"
            >
              @for (level of floors; track level) {
                <option [value]="level" [selected]="floor() === '' + level">
                  {{ t().common.floor[level - 1] }}
                </option>
              }
            </select>
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

        <fieldset class="group">
          <legend>{{ t().admin.apartments.amenities }}</legend>
          <p class="group-hint">{{ t().admin.apartments.amenitiesHint }}</p>
          <ul class="amenities">
            @for (key of amenityKeys; track key) {
              <li>
                <label class="check"
                  ><input
                    type="checkbox"
                    [checked]="amenities().includes(key)"
                    (change)="toggleAmenity(key, checked($event))"
                  /><span>{{ t().amenities[key] }}</span></label
                >
              </li>
            }
          </ul>
        </fieldset>

        <fieldset class="group">
          <legend>{{ t().admin.apartments.labels }}</legend>
          <p class="group-hint">{{ t().admin.apartments.labelsHint }}</p>
          @if (errors()['labels']) {
            <p class="error" role="alert">{{ errors()['labels'] }}</p>
          }
          <ul class="labels">
            @for (label of labels(); track $index; let i = $index) {
              <li>
                <input
                  class="input"
                  type="text"
                  lang="cs"
                  maxlength="40"
                  [attr.aria-label]="t().admin.apartments.labelCs + ' ' + (i + 1)"
                  [placeholder]="t().admin.apartments.labelCs"
                  [value]="label.cs"
                  (input)="setLabel(i, 'cs', value($event))"
                />
                <input
                  class="input"
                  type="text"
                  lang="en"
                  maxlength="40"
                  [attr.aria-label]="t().admin.apartments.labelEn + ' ' + (i + 1)"
                  [placeholder]="t().admin.apartments.labelEn"
                  [value]="label.en"
                  (input)="setLabel(i, 'en', value($event))"
                />
                <button
                  type="button"
                  class="a-icon-btn is-danger"
                  [attr.aria-label]="t().admin.apartments.labelRemove + ' ' + (i + 1)"
                  (click)="removeLabel(i)"
                >
                  <rc-icon name="close" />
                </button>
              </li>
            }
          </ul>
          <div class="presets">
            <span>{{ t().admin.apartments.labelPresets }}:</span>
            @for (preset of presets; track preset.cs) {
              <button
                type="button"
                class="chip"
                [disabled]="hasLabel(preset.cs) || labels().length >= 8"
                (click)="addLabel(preset)"
              >
                + {{ i18n.pick(preset) }}
              </button>
            }
            <button
              type="button"
              class="btn btn-quiet btn-small"
              [disabled]="labels().length >= 8"
              (click)="addLabel({ cs: '', en: '' })"
            >
              {{ t().admin.apartments.labelAdd }}
            </button>
          </div>
        </fieldset>

        <div class="texts">
          <h3>{{ t().admin.apartments.texts }}</h3>
          <p>{{ t().admin.apartments.textsHint }}</p>
        </div>
        <div class="langs">
          @for (l of langs; track l) {
            <fieldset>
              <legend>{{ l === 'cs' ? 'Česky' : 'English' }}</legend>
              <rc-field
                [for]="id('about-' + l)"
                [label]="t().admin.apartments.description"
                [hint]="t().admin.apartments.descriptionHint"
                [error]="errors()['description']"
              >
                <textarea
                  [id]="id('about-' + l)"
                  class="input"
                  rows="4"
                  maxlength="2000"
                  [attr.lang]="l"
                  [value]="description()[l]"
                  (input)="patch(description, l, value($event))"
                  [attr.aria-describedby]="id('about-' + l) + '-msg'"
                ></textarea>
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
      gap: 12px;
      padding: 8px 14px;
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
      font-size: 1.9rem;
      line-height: 0.8;
      color: var(--timber);
    }
    .sum-text {
      display: grid;
      line-height: 1.3;
      font-size: 0.8125rem;
      color: var(--slate-2);
    }
    .sum-text strong {
      font-size: 0.875rem;
      color: var(--slate);
    }
    .sum-price {
      margin-left: auto;
      font-weight: 700;
    }
    form {
      display: grid;
      gap: 14px;
      justify-items: start;
      padding: 4px 14px 16px;
      border-top: 1px solid var(--line);
    }
    .row4 {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
      align-items: start;
      width: 100%;
      margin-top: 10px;
    }
    .checks {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 24px;
    }
    .group {
      width: 100%;
    }
    .group-hint {
      color: var(--slate-2);
      font-size: 0.8125rem;
    }
    .amenities {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 4px 16px;
    }
    .labels {
      display: grid;
      gap: 6px;
      max-width: 620px;
    }
    .labels:empty {
      display: none;
    }
    .labels li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
      gap: 6px;
      align-items: center;
    }
    .presets {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      color: var(--slate-2);
      font-size: 0.8125rem;
    }
    .chip {
      min-height: 26px;
      padding: 0 10px;
      border: 1.5px solid var(--edge);
      border-radius: 999px;
      background: var(--white);
      font-size: 0.8125rem;
      font-weight: 700;
    }
    .chip:hover:not([disabled]) {
      border-color: var(--timber);
      color: var(--timber);
    }
    .chip[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .error {
      font-weight: 700;
      color: var(--timber);
    }
    .texts {
      width: 100%;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      color: var(--slate-2);
    }
    .texts h3 {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--slate);
    }
    .langs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
      gap: 14px;
      width: 100%;
    }
    fieldset {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 8px 12px 12px;
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
  protected readonly flatTypes = FLAT_TYPES;
  protected readonly floors = FLOORS;
  protected readonly amenityKeys = AMENITIES;
  protected readonly presets = LABEL_PRESETS;
  protected readonly flatType = signal('');
  protected readonly floor = signal('1');
  protected readonly amenities = signal<Amenity[]>([]);
  protected readonly labels = signal<L10n[]>([]);
  protected readonly layout = signal({ cs: '', en: '' });
  protected readonly features = signal({ cs: '', en: '' });
  protected readonly note = signal({ cs: '', en: '' });
  protected readonly description = signal({ cs: '', en: '' });
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
    this.flatType.set(a.flat_type ?? '');
    this.floor.set(String(a.floor));
    this.amenities.set([...(a.amenities ?? [])]);
    this.labels.set((a.labels ?? []).map((l) => ({ ...l })));
    this.layout.set({ ...a.layout });
    this.features.set({ cs: a.features.cs.join('\n'), en: a.features.en.join('\n') });
    this.note.set({ ...a.note });
    this.description.set({ cs: a.description?.cs ?? '', en: a.description?.en ?? '' });
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

  protected toggleAmenity(key: Amenity, on: boolean): void {
    this.amenities.update((list) => (on ? [...list, key] : list.filter((k) => k !== key)));
  }

  protected hasLabel(cs: string): boolean {
    return this.labels().some((l) => l.cs.trim().toLowerCase() === cs.toLowerCase());
  }

  protected addLabel(label: L10n): void {
    if (this.labels().length < 8) this.labels.update((list) => [...list, { ...label }]);
  }

  protected setLabel(index: number, lang: 'cs' | 'en', text: string): void {
    this.labels.update((list) => list.map((l, i) => (i === index ? { ...l, [lang]: text } : l)));
  }

  protected removeLabel(index: number): void {
    this.labels.update((list) => list.filter((_, i) => i !== index));
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
      flat_type: this.flatType(),
      floor: Number(this.floor()),
      amenities: this.amenities(),
      labels: this.labels().filter((l) => l.cs.trim() || l.en.trim()),
      layout: this.layout(),
      features: { cs: lines(this.features().cs), en: lines(this.features().en) },
      note: this.note(),
      description: this.description(),
    };
    if (this.price().trim() === '') body['clear_price'] = true;
    else body['price_per_night'] = Math.max(0, Math.round(Number(this.price())));

    this.busy.set(true);
    this.failure.set('');
    this.errors.set({});
    try {
      const saved = await this.api.updateApartment(this.apartment().id, body);
      this.toasts.show(this.t().admin.apartments.saved);
      this.labels.set(saved.labels.map((l) => ({ ...l })));
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
