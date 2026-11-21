import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import type { Apartment, Channel } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { toFailure } from '@utils/api-failure.util';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';
import {
  type ApartmentDraft,
  type ApartmentTexts,
  toApartmentUpdate,
  toDraft,
} from '@utils/apartment-draft.util';
import { ApartmentAmenitiesComponent } from './apartment-amenities/apartment-amenities.component';
import { ApartmentCalendarComponent } from './apartment-calendar/apartment-calendar.component';
import { ApartmentBasicsComponent } from './apartment-basics/apartment-basics.component';
import { ApartmentNameComponent } from './apartment-name/apartment-name.component';
import { ApartmentPhotosComponent } from './apartment-photos/apartment-photos.component';
import { ApartmentLabelListComponent } from './apartment-label-list/apartment-label-list.component';
import { ApartmentSummaryComponent } from './apartment-summary/apartment-summary.component';
import { ApartmentTextsComponent } from './apartment-texts/apartment-texts.component';

@Component({
  selector: 'rc-apartment-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ApartmentSummaryComponent,
    ApartmentNameComponent,
    ApartmentBasicsComponent,
    ApartmentPhotosComponent,
    ApartmentCalendarComponent,
    ApartmentAmenitiesComponent,
    ApartmentLabelListComponent,
    ApartmentTextsComponent,
  ],
  templateUrl: './apartment-editor.component.html',
  styleUrl: './apartment-editor.component.scss',
})
export class ApartmentEditorComponent {
  /** Apartment to edit; the form starts from its values. */
  readonly apartment = input.required<Apartment>();
  /** Its calendar on e-chalupy.cz; `null` when none is connected. */
  readonly channel = input<Channel | null>(null);
  /** The apartment as stored by the API after a successful save. */
  readonly saved = output<Apartment>();
  /** The calendar after it was stored, read or disconnected (`null`). */
  readonly channelChange = output<Channel | null>();

  protected readonly t = inject(I18nService).t;
  protected readonly langs = ['cs', 'en'] as const;
  protected readonly draft = linkedSignal<ApartmentDraft>(() => toDraft(this.apartment()));
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly busy = signal(false);
  /** Set when the editor is opened for the first time; the photos load from then on. */
  protected readonly opened = signal(false);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  protected patch(change: Partial<ApartmentDraft>): void {
    this.draft.update((d) => ({ ...d, ...change }));
  }

  protected setTexts(lang: 'cs' | 'en', texts: ApartmentTexts): void {
    this.draft.update((d) => ({ ...d, texts: { ...d.texts, [lang]: texts } }));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.busy.set(true);
    this.failure.set('');
    this.errors.set({});
    try {
      const saved = await this.api.updateApartment(
        this.apartment().id,
        toApartmentUpdate(this.draft()),
      );
      this.toasts.show(this.t().admin.apartments.saved);
      this.saved.emit(saved);
    } catch (err) {
      const failure = toFailure(err);
      if (failure.code === 'validation') {
        const required = this.t().errors.required;
        this.errors.set(Object.fromEntries(Object.keys(failure.fields).map((f) => [f, required])));
        this.failure.set(this.t().booking.fixErrors);
      } else {
        this.failure.set(this.t().admin.common.error);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
