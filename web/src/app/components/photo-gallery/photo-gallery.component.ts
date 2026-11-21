import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { PhotoGridComponent } from '@components/photo-grid/photo-grid.component';
import { NearViewDirective } from '@directives/near-view.directive';
import type { Photo } from '@models/api.model';
import { type PhotoCategory, isPhotoCategory } from '@models/photo-category.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { GalleryFilterComponent } from './gallery-filter/gallery-filter.component';
import { GalleryMoreComponent } from './gallery-more/gallery-more.component';
import { photoSlides } from '@utils/slides.util';

const PAGE = 24;

/**
 * Photos arrive one page at a time: the next page is requested when the visitor scrolls close
 * to the end, presses the button or pages near the end of the lightbox.
 */
@Component({
  selector: 'rc-photo-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PhotoGridComponent,
    LightboxComponent,
    NearViewDirective,
    GalleryFilterComponent,
    GalleryMoreComponent,
  ],
  templateUrl: './photo-gallery.component.html',
  styleUrl: './photo-gallery.component.scss',
})
export class PhotoGalleryComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly category = signal<PhotoCategory | null>(null);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly total = signal(0);
  protected readonly counts = signal<Record<string, number>>({});
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly slides = computed(() => photoSlides(this.photos(), this.api, this.i18n));
  protected readonly hasMore = computed(() => this.photos().length < this.total());

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private nextOffset: number | null = 0;
  /** Guards against a late answer for a category the visitor has already left. */
  private generation = 0;

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get('c');
    if (isPhotoCategory(initial)) this.category.set(initial);
    void this.load();
  }

  protected choose(category: PhotoCategory | null): void {
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
