import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  protected readonly t = inject(I18nService).t;
  protected readonly items = signal<Apartment[] | null>(null);

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
