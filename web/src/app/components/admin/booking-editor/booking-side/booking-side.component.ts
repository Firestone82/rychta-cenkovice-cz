import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import { I18nService } from '@services/i18n.service';
import { checkedOf } from '@utils/forms.util';
import { BookingEditorStore } from '../booking-editor.store';
import { BookingActionsComponent } from './booking-actions/booking-actions.component';

@Component({
  selector: 'rc-booking-side',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent, BookingActionsComponent],
  templateUrl: './booking-side.component.html',
  styleUrl: './booking-side.component.scss',
})
export class BookingSideComponent {
  protected readonly store = inject(BookingEditorStore);
  protected readonly t = inject(I18nService).t;
  protected readonly checked = checkedOf;
}
