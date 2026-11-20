import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApartmentFactsComponent } from '@components/apartment-facts/apartment-facts.component';
import { ApartmentLabelsComponent } from '@components/apartment-labels/apartment-labels.component';
import { PicComponent } from '@components/pic/pic.component';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

/** How an apartment stands for the chosen stay; `short` means the stay is under its minimum. */
export type StayState = 'free' | 'taken' | 'short' | null;

@Component({
  selector: 'rc-apartment-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PicComponent, ApartmentFactsComponent, ApartmentLabelsComponent],
  templateUrl: './apartment-card.component.html',
  styleUrl: './apartment-card.component.scss',
})
export class ApartmentCardComponent {
  /** Apartment the card links to. */
  readonly apartment = input.required<Apartment>();
  /** Availability for the chosen stay; `null` hides the tag and the booking button. */
  readonly state = input<StayState>(null);
  /** Length of the chosen stay; 0 shows the nightly price instead of the stay price. */
  readonly nights = input(0);
  /** Arrival passed on to the booking form. */
  readonly from = input('');
  /** Departure passed on to the booking form. */
  readonly to = input('');

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;

  protected minNightsText(a: Apartment): string {
    return this.i18n.fill(this.t().accommodation.dates.minNights, {
      n: this.i18n.count(a.min_nights, this.t().plural.nights),
    });
  }

  protected forStayText(): string {
    return this.i18n.fill(this.t().accommodation.dates.forStay, {
      nights: this.i18n.count(this.nights(), this.t().plural.nights),
    });
  }

  protected perNightText(price: number): string {
    return this.i18n.fill(this.t().accommodation.dates.perNight, { price: this.i18n.money(price) });
  }
}
