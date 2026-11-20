import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  type SelectOption,
  SelectFieldComponent,
} from '@components/select-field/select-field.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import type { BookingStatus } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { BookingEditorStore } from '../booking-editor.store';
import { UnitPickerComponent } from './unit-picker/unit-picker.component';

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled'];

@Component({
  selector: 'rc-booking-stay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent, SelectFieldComponent, UnitPickerComponent],
  templateUrl: './booking-stay.component.html',
  styleUrl: './booking-stay.component.scss',
})
export class BookingStayComponent {
  protected readonly store = inject(BookingEditorStore);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly statuses = computed<SelectOption[]>(() =>
    STATUSES.map((value) => ({ value, label: this.t().admin.bookings.status[value] })),
  );

  protected setStatus(value: string): void {
    const status = STATUSES.find((s) => s === value);
    if (status) this.store.status.set(status);
  }
}
