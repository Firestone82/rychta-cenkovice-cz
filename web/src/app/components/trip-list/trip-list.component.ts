import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Trip } from '@models/i18n.model';
import { TripRowComponent } from './trip-row/trip-row.component';

@Component({
  selector: 'rc-trip-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TripRowComponent],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent {
  /** Heading of the list. */
  readonly title = input.required<string>();
  /** Paragraph under the heading. */
  readonly lead = input.required<string>();
  /** Destinations in the order they are shown. */
  readonly trips = input.required<Trip[]>();
  /** Id of the heading, for `aria-labelledby` on the surrounding section. */
  readonly headingId = input.required<string>();
}
