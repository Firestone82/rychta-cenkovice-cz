import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Apartment, Photo } from '@models/api.model';
import type { PhotoCategory } from '@models/photo-category.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { PhotoCardComponent } from './photo-card/photo-card.component';
import { PhotoTargetComponent } from './photo-target/photo-target.component';

@Component({
  selector: 'rc-photo-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent, PhotoTargetComponent, PhotoCardComponent],
  templateUrl: './photo-manager.component.html',
  styleUrl: './photo-manager.component.scss',
})
export class PhotoManagerComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly category = signal<PhotoCategory>('house');
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly apartmentId = signal(0);
  protected readonly items = signal<Photo[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly problems = signal<string[]>([]);
  protected readonly progress = computed(() => {
    const u = this.uploading();
    return u ? this.i18n.fill(this.t().admin.photos.uploading, u) : '';
  });

  private readonly api = inject(AdminApiService);
  private readonly uploading = signal<{ n: number; total: number } | null>(null);

  constructor() {
    this.api.apartments().then(
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

  protected async upload(files: File[]): Promise<void> {
    const target = this.target();
    const problems: string[] = [];
    for (const [i, file] of files.entries()) {
      this.uploading.set({ n: i + 1, total: files.length });
      try {
        await this.api.uploadPhoto(file, target.category, target.apartment ?? null);
      } catch {
        problems.push(this.i18n.fill(this.t().admin.photos.failed, { name: file.name }));
      }
    }
    this.uploading.set(null);
    this.problems.set(problems);
    this.load();
  }

  protected replace(saved: Photo): void {
    this.items.update((list) => (list ?? []).map((x) => (x.id === saved.id ? saved : x)));
  }

  protected drop(id: number): void {
    this.items.update((list) => (list ?? []).filter((x) => x.id !== id));
  }

  private target(): { category: PhotoCategory; apartment: number | undefined } {
    const category = this.category();
    return {
      category,
      apartment: category === 'apartment' ? this.apartmentId() || undefined : undefined,
    };
  }

  private load(): void {
    const target = this.target();
    if (target.category === 'apartment' && !target.apartment) return;
    this.api.photos(target).then(
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
}
