import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import { RevealDirective } from '@directives/reveal.directive';
import type { Apartment } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { addDays, isISO, nightsBetween, todayISO } from '@utils/dates.util';
import { ApartmentCardComponent, type StayState } from './apartment-card/apartment-card.component';
import { StayDatesComponent } from './stay-dates/stay-dates.component';

@Component({
  selector: 'rc-apartment-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, SpinnerComponent, ApartmentCardComponent, StayDatesComponent],
  templateUrl: './apartment-list.component.html',
  styleUrl: './apartment-list.component.scss',
})
export class ApartmentListComponent {
  /** Apartments to list; `null` while loading, empty when loading failed. */
  readonly apartments = input.required<Apartment[] | null>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly invalid = computed(
    () => isISO(this.from()) && isISO(this.to()) && this.to() <= this.from(),
  );
  protected readonly nights = computed(() =>
    isISO(this.from()) && isISO(this.to()) && this.to() > this.from()
      ? nightsBetween(this.from(), this.to())
      : 0,
  );
  /** Ids of apartments taken in the chosen dates; null until dates are chosen and checked. */
  protected readonly taken = signal<number[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly message = computed(() => {
    const taken = this.taken();
    if (this.invalid()) return this.t().booking.datesInvalid;
    if (this.failed()) return this.t().accommodation.dates.failed;
    return taken ? this.summary(taken) : '';
  });

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  constructor() {
    const query = this.route.snapshot.queryParamMap;
    const from = query.get('from');
    const to = query.get('to');
    if (isISO(from) && from >= todayISO()) {
      this.from.set(from);
      this.to.set(isISO(to) && to > from ? to : addDays(from, 2));
    }

    effect((onCleanup) => {
      const [checkIn, checkOut, nights] = [this.from(), this.to(), this.nights()];
      this.taken.set(null);
      this.failed.set(false);
      if (!nights) return;
      let current = true;
      onCleanup(() => (current = false));
      this.api.checkAvailability(checkIn, checkOut).then(
        (ids) => current && this.taken.set(ids),
        () => current && this.failed.set(true),
      );
    });
  }

  protected setFrom(value: string): void {
    this.from.set(value);
    if (isISO(value) && (!isISO(this.to()) || this.to() <= value)) this.to.set(addDays(value, 2));
    this.remember();
  }

  protected setTo(value: string): void {
    this.to.set(value);
    this.remember();
  }

  protected state(a: Apartment): StayState {
    const taken = this.taken();
    if (!taken) return null;
    if (taken.includes(a.id)) return 'taken';
    return this.nights() < a.min_nights ? 'short' : 'free';
  }

  /**
   * Keeps the chosen dates in the address, so the view can be shared or reloaded. The address
   * is replaced in place: a router navigation would replay the page transition on every change.
   */
  private remember(): void {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: this.nights() ? { from: this.from(), to: this.to() } : {},
    });
    this.location.replaceState(this.router.serializeUrl(tree));
  }

  private summary(taken: number[]): string {
    const all = this.apartments() ?? [];
    return this.i18n.fill(this.t().accommodation.dates.summary, {
      range: this.i18n.range(this.from(), this.to()),
      nights: this.i18n.count(this.nights(), this.t().plural.nights),
      free: all.filter((a) => !taken.includes(a.id)).length,
      total: all.length,
    });
  }
}
