import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApartmentEditorComponent } from '@components/admin/apartment-editor/apartment-editor.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Apartment } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-admin-apartments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApartmentEditorComponent, SpinnerComponent],
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

  constructor() {
    inject(SeoService).noIndex(this.t().admin.apartments.title);
    inject(AdminApiService)
      .apartments()
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
