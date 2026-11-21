import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { TileSize } from '@components/admin/tile-size/tile-size.component';
import type { Apartment, Photo } from '@models/api.model';
import { PHOTO_CATEGORIES, type PhotoCategory } from '@models/photo-category.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { uploadPhotos } from '@utils/photo-upload.util';
import { readStored, writeStored } from '@utils/storage.util';
import { PhotoEditorComponent } from '@components/admin/photo-editor/photo-editor.component';
import { PhotoSectionComponent } from '@components/admin/photo-section/photo-section.component';

/** A row of the page: one gallery category, or the photos of one apartment. */
interface PhotoGroup {
  key: string;
  heading: string;
  category: PhotoCategory;
  apartmentId: number | null;
  photos: Photo[];
}

const COLLAPSED_KEY = 'rc_admin_photo_rows';

/**
 * All photos of the site in collapsible rows, one per category and one per apartment.
 * Each row uploads into itself; descriptions are edited in a window over the page.
 */
@Component({
  selector: 'rc-photo-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent, PhotoSectionComponent, PhotoEditorComponent],
  templateUrl: './photo-manager.component.html',
  styleUrl: './photo-manager.component.scss',
})
export class PhotoManagerComponent {
  /** Size of the photo tiles. */
  readonly size = input<TileSize>('medium');

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly photos = signal<Photo[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly problems = signal<string[]>([]);
  protected readonly editing = signal<Photo | null>(null);
  protected readonly collapsed = signal(readStored<string[]>(COLLAPSED_KEY, []));
  protected readonly uploading = signal<{ key: string; n: number; total: number } | null>(null);
  protected readonly progress = computed(() => {
    const u = this.uploading();
    return u ? this.i18n.fill(this.t().admin.photos.uploading, u) : '';
  });
  protected readonly groups = computed(() =>
    PHOTO_CATEGORIES.flatMap((category) =>
      category === 'apartment'
        ? this.apartments().map((a) => this.group(category, a))
        : [this.group(category, null)],
    ),
  );

  private readonly api = inject(AdminApiService);
  private readonly apartments = signal<Apartment[]>([]);

  constructor() {
    this.api.apartments().then(
      (list) => this.apartments.set(list),
      () => undefined,
    );
    void this.load();
  }

  protected setOpen(key: string, open: boolean): void {
    this.collapsed.update((keys) => (open ? keys.filter((k) => k !== key) : [...keys, key]));
    writeStored(COLLAPSED_KEY, this.collapsed());
  }

  protected async upload(group: PhotoGroup, files: File[]): Promise<void> {
    const refused = await uploadPhotos(this.api, files, group, (n, total) =>
      this.uploading.set({ key: group.key, n, total }),
    );
    this.uploading.set(null);
    this.problems.set(
      refused.map((name) => this.i18n.fill(this.t().admin.photos.failed, { name })),
    );
    await this.load();
  }

  protected replace(saved: Photo): void {
    this.photos.update((list) => (list ?? []).map((x) => (x.id === saved.id ? saved : x)));
    this.editing.set(null);
  }

  protected drop(id: number): void {
    this.photos.update((list) => (list ?? []).filter((x) => x.id !== id));
  }

  private group(category: PhotoCategory, apartment: Apartment | null): PhotoGroup {
    const all = this.photos() ?? [];
    return {
      key: apartment ? `apartment-${apartment.id}` : category,
      heading: apartment ? this.i18n.apartment(apartment) : this.t().gallery.categories[category],
      category,
      apartmentId: apartment?.id ?? null,
      photos: all.filter(
        (p) => p.category === category && (!apartment || p.apartment_id === apartment.id),
      ),
    };
  }

  /** The API hands the photos out in pages; the rows need all of them. */
  private async load(): Promise<void> {
    try {
      const all: Photo[] = [];
      let total = Infinity;
      while (all.length < total) {
        const page = await this.api.photos({ offset: all.length });
        if (!page.items.length) break;
        all.push(...page.items);
        total = page.total;
      }
      this.photos.set(all);
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    }
  }
}
