import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/api';
import { I18n } from '../../core/i18n/i18n';
import type { Photo } from '../../core/models';
import { Seo } from '../../core/seo';
import { Lightbox } from '../../ui/lightbox';
import { PhotoGrid } from '../../ui/photo-grid';
import { Spinner } from '../../ui/spinner';

const PAGE = 24;
const ORDER = [
  'house',
  'apartment',
  'common-room',
  'facilities',
  'wellness',
  'surroundings',
  'winter',
  'trips',
] as const;
type Category = (typeof ORDER)[number];

/**
 * The photo gallery. Photos arrive from the API one page at a time: the next page is
 * requested when the visitor scrolls close to the end (or presses the button), and each
 * tile downloads its image only when it is about to be seen.
 */
@Component({
  selector: 'rc-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoGrid, Lightbox, Spinner],
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().gallery.title }}</h1>
      <p class="lead">{{ t().gallery.lead }}</p>
    </header>

    <div class="wrap body">
      <div class="filter" role="group" [attr.aria-label]="t().gallery.title">
        <button type="button" [attr.aria-pressed]="category() === null" (click)="choose(null)">
          {{ t().gallery.all }} <span class="count">{{ allCount() }}</span>
        </button>
        @for (c of categories(); track c.key) {
          <button type="button" [attr.aria-pressed]="category() === c.key" (click)="choose(c.key)">
            {{ t().gallery.categories[c.key] }} <span class="count">{{ c.count }}</span>
          </button>
        }
      </div>

      @if (photos().length) {
        <rc-photo-grid
          [photos]="photos()"
          [rhythm]="true"
          [eagerCount]="4"
          (open)="lightbox.set($event)"
        />
      } @else if (!loading() && !failed()) {
        <p class="notice">{{ t().gallery.empty }}</p>
      }

      <div class="more" #sentinel>
        @if (failed()) {
          <p class="notice is-error" role="alert">{{ t().common.loadFailed }}</p>
          <button type="button" class="btn btn-ghost" (click)="load()">
            {{ t().common.retry }}
          </button>
        } @else if (loading()) {
          <rc-spinner [label]="photos().length ? t().gallery.loadingMore : t().common.loading" />
        } @else if (hasMore()) {
          <button type="button" class="btn btn-ghost" (click)="load()">
            {{ t().gallery.loadMore }}
          </button>
        }
        @if (total() > 0) {
          <p class="shown muted" aria-live="polite">
            {{ i18n.fill(t().gallery.shown, { n: photos().length, total: total() }) }}
          </p>
        }
      </div>
    </div>

    <rc-lightbox [photos]="photos()" [total]="total()" [(index)]="lightbox" (nearEnd)="load()" />
  `,
  styles: `
    .body {
      padding-bottom: var(--section);
    }
    .filter {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 28px;
    }
    .filter button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 16px;
      border: 1.5px solid var(--edge);
      border-radius: 999px;
      background: transparent;
      font-weight: 700;
      font-size: 0.97rem;
      transition:
        background 0.2s,
        border-color 0.2s,
        color 0.2s;
    }
    .filter button:hover {
      border-color: var(--slate);
    }
    .filter button[aria-pressed='true'] {
      background: var(--slate);
      border-color: var(--slate);
      color: var(--white);
    }
    .count {
      font-weight: 500;
      font-size: 0.88rem;
      opacity: 0.72;
    }
    .more {
      display: grid;
      justify-items: center;
      gap: 14px;
      min-height: 120px;
      padding-top: 36px;
    }
  `,
})
export class GalleryPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly category = signal<Category | null>(null);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly total = signal(0);
  protected readonly counts = signal<Record<string, number>>({});
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly lightbox = signal<number | null>(null);
  private nextOffset: number | null = 0;
  /** Guards against a late answer for a category the visitor has already left. */
  private generation = 0;

  protected readonly hasMore = computed(() => this.photos().length < this.total());
  protected readonly categories = computed(() =>
    ORDER.filter((key) => this.counts()[key]).map((key) => ({ key, count: this.counts()[key] })),
  );
  protected readonly allCount = computed(() =>
    Object.values(this.counts()).reduce((sum, n) => sum + n, 0),
  );

  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    inject(Seo).page(this.t().gallery.title, this.t().gallery.lead);
    const initial = this.route.snapshot.queryParamMap.get('c');
    if (initial && (ORDER as readonly string[]).includes(initial))
      this.category.set(initial as Category);
    void this.load();

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) void this.load();
        },
        { rootMargin: '900px 0px' },
      );
      observer.observe(this.sentinel().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected choose(category: Category | null): void {
    if (category === this.category()) return;
    this.category.set(category);
    this.generation++;
    this.photos.set([]);
    this.total.set(0);
    this.nextOffset = 0;
    this.loading.set(false);
    this.lightbox.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { c: category },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    void this.load();
  }

  protected async load(): Promise<void> {
    if (this.loading() || this.nextOffset === null) return;
    const generation = this.generation;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await this.api.photos({
        category: this.category() ?? undefined,
        offset: this.nextOffset,
        limit: PAGE,
      });
      if (generation !== this.generation) return;
      this.photos.update((list) => [...list, ...page.items]);
      this.total.set(page.total);
      this.nextOffset = page.next_offset;
      if (page.categories) this.counts.set(page.categories);
    } catch {
      if (generation === this.generation) this.failed.set(true);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
}
