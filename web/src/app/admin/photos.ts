import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Api } from '../core/api';
import { valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import type { Apartment, Photo } from '../core/models';
import { Seo } from '../core/seo';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';

const CATEGORIES = [
  'house',
  'apartment',
  'common-room',
  'facilities',
  'wellness',
  'surroundings',
  'winter',
  'trips',
] as const;
type Category = (typeof CATEGORIES)[number];

@Component({
  selector: 'rc-admin-photos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Spinner],
  template: `
    <div class="a-head">
      <div>
        <h1>{{ t().admin.photos.title }}</h1>
        <p>{{ t().admin.photos.lead }}</p>
      </div>
    </div>

    <div class="a-filters">
      <div class="field">
        <label for="ph-cat">{{ t().admin.photos.category }}</label>
        <select id="ph-cat" class="input" (change)="setCategory(value($event))">
          @for (c of categories; track c) {
            <option [value]="c" [selected]="category() === c">
              {{ t().gallery.categories[c] }}
            </option>
          }
        </select>
      </div>
      @if (category() === 'apartment') {
        <div class="field">
          <label for="ph-apt">{{ t().admin.photos.apartment }}</label>
          <select id="ph-apt" class="input" (change)="apartmentId.set(toNumber(value($event)))">
            @for (a of apartments(); track a.id) {
              <option [value]="a.id" [selected]="apartmentId() === a.id">
                {{ t().common.apartment }} {{ a.number }}
              </option>
            }
          </select>
        </div>
      }
      <div class="upload">
        <input
          #file
          id="ph-file"
          class="sr-only"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          (change)="upload(file)"
          [disabled]="!!progress()"
        />
        <label for="ph-file" class="btn" [attr.aria-disabled]="progress() ? 'true' : null"
          ><rc-icon name="plus" /> {{ progress() || t().admin.photos.upload }}</label
        >
      </div>
    </div>

    @if (problems().length) {
      <ul class="notice is-error problems" role="alert">
        @for (p of problems(); track p) {
          <li>{{ p }}</li>
        }
      </ul>
    }

    @if (items(); as list) {
      @if (list.length) {
        <ul class="grid">
          @for (p of list; track p.id) {
            <li class="a-card">
              <img
                [src]="api.photoUrl(p, p.widths[0])"
                [alt]="p.alt.cs"
                [width]="p.width"
                [height]="p.height"
                loading="lazy"
                decoding="async"
                [style.background-color]="p.color"
              />
              @if (editing() === p.id) {
                <form (submit)="saveAlt($event, p)">
                  <div class="field">
                    <label [attr.for]="'alt-cs-' + p.id">{{ t().admin.photos.altCs }}</label>
                    <input
                      [id]="'alt-cs-' + p.id"
                      class="input"
                      type="text"
                      lang="cs"
                      [value]="altCs()"
                      (input)="altCs.set(value($event))"
                    />
                  </div>
                  <div class="field">
                    <label [attr.for]="'alt-en-' + p.id">{{ t().admin.photos.altEn }}</label>
                    <input
                      [id]="'alt-en-' + p.id"
                      class="input"
                      type="text"
                      lang="en"
                      [value]="altEn()"
                      (input)="altEn.set(value($event))"
                    />
                  </div>
                  <div class="a-actions">
                    <button class="btn btn-small" type="submit">{{ t().admin.photos.save }}</button>
                    <button
                      class="btn btn-small btn-quiet"
                      type="button"
                      (click)="editing.set(null)"
                    >
                      {{ t().admin.common.cancel }}
                    </button>
                  </div>
                </form>
              } @else {
                <p class="alt">{{ p.alt.cs }}</p>
                <div class="a-actions">
                  <button type="button" class="btn btn-small btn-quiet" (click)="edit(p)">
                    <rc-icon name="edit" /> {{ t().admin.photos.edit }}
                  </button>
                  <button
                    type="button"
                    class="a-icon-btn is-danger"
                    (click)="remove(p)"
                    [attr.aria-label]="t().admin.photos.delete + ': ' + p.alt.cs"
                  >
                    <rc-icon name="trash" />
                  </button>
                </div>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="a-empty">{{ failed() ? t().common.loadFailed : t().admin.photos.empty }}</p>
      }
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .a-filters .input {
      min-width: 200px;
    }
    .upload {
      margin-left: auto;
    }
    .upload input:focus-visible + label {
      outline: 3px solid var(--winter);
      outline-offset: 3px;
    }
    .upload label {
      cursor: pointer;
    }
    .problems {
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }
    li.a-card {
      display: grid;
      gap: 8px;
      align-content: start;
      padding: 8px;
    }
    img {
      width: 100%;
      height: auto;
      aspect-ratio: 4 / 3;
      object-fit: cover;
    }
    .alt {
      font-size: 0.8125rem;
      color: var(--slate-2);
      min-height: 2.8em;
    }
    form {
      display: grid;
      gap: 10px;
    }
    .a-actions {
      justify-content: space-between;
    }
  `,
})
export class PhotosPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  protected readonly categories = CATEGORIES;
  protected readonly category = signal<Category>('house');
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly apartmentId = signal(0);
  protected readonly items = signal<Photo[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly editing = signal<number | null>(null);
  protected readonly altCs = signal('');
  protected readonly altEn = signal('');
  protected readonly uploading = signal<{ n: number; total: number } | null>(null);
  protected readonly problems = signal<string[]>([]);
  protected readonly value = valueOf;

  protected readonly progress = computed(() => {
    const u = this.uploading();
    return u ? this.i18n.fill(this.t().admin.photos.uploading, u) : '';
  });

  constructor() {
    inject(Seo).noIndex(this.t().admin.photos.title);
    this.api.adminApartments().then(
      (list) => {
        this.apartments.set(list);
        if (list.length) this.apartmentId.set(list[0].id);
      },
      () => undefined,
    );
    effect(() => {
      this.category();
      this.apartmentId();
      untracked(() => this.load());
    });
  }

  protected setCategory(value: string): void {
    if ((CATEGORIES as readonly string[]).includes(value)) this.category.set(value as Category);
  }

  protected toNumber(text: string): number {
    return Number(text) || 0;
  }

  private target(): { category: Category; apartment: number | undefined } {
    const category = this.category();
    return {
      category,
      apartment: category === 'apartment' ? this.apartmentId() || undefined : undefined,
    };
  }

  private load(): void {
    const target = this.target();
    if (target.category === 'apartment' && !target.apartment) return;
    this.api.adminPhotos(target).then(
      (page) => {
        const now = this.target();
        if (now.category !== target.category || now.apartment !== target.apartment) return;
        this.failed.set(false);
        this.items.set(page.items);
      },
      () => {
        this.failed.set(true);
        this.items.set([]);
      },
    );
  }

  protected async upload(input: HTMLInputElement): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    const target = this.target();
    const problems: string[] = [];
    for (let i = 0; i < files.length; i++) {
      this.uploading.set({ n: i + 1, total: files.length });
      try {
        await this.api.uploadPhoto(files[i], target.category, target.apartment ?? null);
      } catch {
        problems.push(this.i18n.fill(this.t().admin.photos.failed, { name: files[i].name }));
      }
    }
    this.uploading.set(null);
    this.problems.set(problems);
    this.load();
  }

  protected edit(p: Photo): void {
    this.altCs.set(p.alt.cs);
    this.altEn.set(p.alt.en);
    this.editing.set(p.id);
  }

  protected async saveAlt(event: Event, p: Photo): Promise<void> {
    event.preventDefault();
    try {
      const saved = await this.api.updatePhoto(p.id, {
        alt: { cs: this.altCs().trim(), en: this.altEn().trim() },
      });
      this.items.update((list) => (list ?? []).map((x) => (x.id === p.id ? saved : x)));
      this.editing.set(null);
      this.toasts.show(this.t().admin.bookings.saved);
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }

  protected async remove(p: Photo): Promise<void> {
    if (!confirm(this.t().admin.photos.deleteConfirm)) return;
    try {
      await this.api.deletePhoto(p.id);
      this.items.update((list) => (list ?? []).filter((x) => x.id !== p.id));
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }
}
