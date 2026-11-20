import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  type SelectOption,
  SelectFieldComponent,
} from '@components/select-field/select-field.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import { I18nService } from '@services/i18n.service';
import { BookingEditorStore } from '../booking-editor.store';

@Component({
  selector: 'rc-booking-person',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent, SelectFieldComponent],
  templateUrl: './booking-person.component.html',
  styleUrl: './booking-person.component.scss',
})
export class BookingPersonComponent {
  protected readonly store = inject(BookingEditorStore);
  protected readonly t = inject(I18nService).t;
  protected readonly languages: SelectOption[] = [
    { value: 'cs', label: 'Česky' },
    { value: 'en', label: 'English' },
  ];
}
