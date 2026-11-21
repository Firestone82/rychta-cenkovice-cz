import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import type { Trip } from '@models/i18n.model';
import { bundledSlide } from '@utils/images.util';
import { TripRowComponent } from './trip-row/trip-row.component';

@Component({
  selector: 'rc-trip-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TripRowComponent, LightboxComponent],
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

  protected readonly lightbox = signal<number | null>(null);
  private readonly pictured = computed(() =>
    this.trips().flatMap((trip) => {
      const slide = trip.img ? bundledSlide(`trip-${trip.img}`, trip.name) : null;
      return slide ? [{ trip, slide }] : [];
    }),
  );
  protected readonly slides = computed(() => this.pictured().map((p) => p.slide));

  protected open(trip: Trip): void {
    const index = this.pictured().findIndex((p) => p.trip === trip);
    if (index >= 0) this.lightbox.set(index);
  }
}
