import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { PhotoEditorComponent } from '@components/admin/photo-editor/photo-editor.component';
import { PhotoSectionComponent } from '@components/admin/photo-section/photo-section.component';
import { SkeletonComponent } from '@components/admin/skeleton/skeleton.component';
import type { Apartment, Photo } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { uploadPhotos } from '@utils/photo-upload.util';
import { placeholderPhotos } from '@utils/placeholders.util';

/** The photos of one apartment; the same ones the Photos page lists under that apartment. */
@Component({
  selector: 'rc-apartment-photos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, SkeletonComponent, PhotoSectionComponent, PhotoEditorComponent],
  templateUrl: './apartment-photos.component.html',
  styleUrl: './apartment-photos.component.scss',
})
export class ApartmentPhotosComponent {
  /** Apartment whose photos are managed. */
  readonly apartment = input.required<Apartment>();
  /** Photos are fetched once this turns true, so closed editors download nothing. */
  readonly active = input(false);

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly photos = signal<Photo[] | null>(null);
  protected readonly placeholders = placeholderPhotos(4);
  protected readonly failed = signal(false);
  protected readonly problems = signal<string[]>([]);
  protected readonly editing = signal<Photo | null>(null);
  protected readonly uploading = signal<{ n: number; total: number } | null>(null);
  protected readonly progress = computed(() => {
    const u = this.uploading();
    return u ? this.i18n.fill(this.t().admin.photos.uploading, u) : '';
  });

  private readonly api = inject(AdminApiService);

  constructor() {
    effect(() => {
      if (this.active() && this.photos() === null && !this.failed()) void this.load();
    });
  }

  protected async upload(files: File[]): Promise<void> {
    const target = { category: 'apartment' as const, apartmentId: this.apartment().id };
    const refused = await uploadPhotos(this.api, files, target, (n, total) =>
      this.uploading.set({ n, total }),
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

  /** The API hands the photos out in pages. */
  private async load(): Promise<void> {
    try {
      const all: Photo[] = [];
      let total = Infinity;
      while (all.length < total) {
        const page = await this.api.photos({
          category: 'apartment',
          apartment: this.apartment().id,
          offset: all.length,
        });
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
