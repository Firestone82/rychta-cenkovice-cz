import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { addDays, isISO, todayISO } from '@utils/dates.util';
import { valueOf } from '@utils/forms.util';

@Component({
  selector: 'rc-stay-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './stay-search.component.html',
  styleUrl: './stay-search.component.scss',
})
export class StaySearchComponent {
  protected readonly t = inject(I18nService).t;
  private readonly links = inject(LinksService);
  private readonly router = inject(Router);

  protected readonly today = todayISO();
  protected readonly checkIn = signal('');
  protected readonly checkOut = signal('');
  protected readonly guests = signal(4);
  protected readonly minCheckOut = computed(() =>
    isISO(this.checkIn()) ? addDays(this.checkIn(), 1) : addDays(this.today, 1),
  );
  protected readonly value = valueOf;

  protected setCheckIn(value: string): void {
    this.checkIn.set(value);
    if (isISO(value) && (!isISO(this.checkOut()) || this.checkOut() <= value))
      this.checkOut.set(addDays(value, 2));
  }

  protected search(event: Event): void {
    event.preventDefault();
    const query: Record<string, string | number> = { guests: this.guests() };
    if (isISO(this.checkIn())) query['from'] = this.checkIn();
    if (isISO(this.checkOut())) query['to'] = this.checkOut();
    void this.router.navigate(this.links.to('booking'), { queryParams: query });
  }

  protected guestCount(event: Event): number {
    return Math.max(1, Math.min(40, Number(valueOf(event)) || 1));
  }
}
