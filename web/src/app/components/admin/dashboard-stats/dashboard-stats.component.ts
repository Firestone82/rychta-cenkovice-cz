import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Dashboard } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-dashboard-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard-stats.component.html',
  styleUrl: './dashboard-stats.component.scss',
})
export class DashboardStatsComponent {
  /** Today's counters: pending requests, new messages, occupancy and guests. */
  readonly data = input.required<Dashboard>();

  protected readonly t = inject(I18nService).t;
}
