import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApartmentEditorComponent } from '@components/admin/apartment-editor/apartment-editor.component';
import { SkeletonComponent } from '@components/admin/skeleton/skeleton.component';
import type { Apartment, Channel } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-admin-apartments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApartmentEditorComponent, SkeletonComponent],
  templateUrl: './apartments.page.html',
  styleUrl: './apartments.page.scss',
})
export class ApartmentsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly items = signal<Apartment[] | null>(null);
  /** The apartments under their floor, floors in the order the list first reaches them. */
  protected readonly floors = computed(() => {
    const groups = new Map<number, Apartment[]>();
    for (const a of this.items() ?? []) groups.set(a.floor, [...(groups.get(a.floor) ?? []), a]);
    return [...groups].map(([floor, apartments]) => ({ floor, apartments }));
  });

  /** The portal calendar of each apartment that has one, by apartment id. */
  protected readonly channels = signal(new Map<number, Channel>());

  constructor() {
    inject(SeoService).noIndex(this.t().admin.apartments.title);
    const api = inject(AdminApiService);
    api.apartments().then(
      (list) => this.items.set(list),
      () => this.items.set([]),
    );
    // Without the calendars the apartments can still be edited.
    api.channels().then(
      (list) => this.channels.set(new Map(list.map((c) => [c.apartment_id, c]))),
      () => undefined,
    );
  }

  protected setChannel(apartmentId: number, channel: Channel | null): void {
    this.channels.update((current) => {
      const next = new Map(current);
      if (channel) next.set(apartmentId, channel);
      else next.delete(apartmentId);
      return next;
    });
  }

  protected replace(saved: Apartment): void {
    this.items.update((list) =>
      (list ?? []).map((a) => (a.id === saved.id ? { ...a, ...saved } : a)),
    );
  }
}
