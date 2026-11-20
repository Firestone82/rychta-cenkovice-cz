import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BookingEditorStore } from './booking-editor.store';
import { BookingPersonComponent } from './booking-person/booking-person.component';
import { BookingSideComponent } from './booking-side/booking-side.component';
import { BookingStayComponent } from './booking-stay/booking-stay.component';

/** Form of the admin booking editor; expects a `BookingEditorStore` from an ancestor. */
@Component({
  selector: 'rc-booking-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookingStayComponent, BookingPersonComponent, BookingSideComponent],
  templateUrl: './booking-editor.component.html',
  styleUrl: './booking-editor.component.scss',
})
export class BookingEditorComponent {
  protected readonly store = inject(BookingEditorStore);

  protected save(event: Event): void {
    event.preventDefault();
    void this.store.save();
  }
}
