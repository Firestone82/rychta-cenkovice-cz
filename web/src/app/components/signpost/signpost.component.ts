import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import type { Trip } from '@models/i18n.model';

/**
 * Destinations listed like a Czech trail signpost: place on the left, kilometres on the
 * right, the board ending in an arrow.
 */
@Component({
  selector: 'rc-signpost',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signpost.component.html',
  styleUrl: './signpost.component.scss',
})
export class SignpostComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  /** Destinations shown as arms of the signpost. */
  readonly trips = input.required<Trip[]>();
}
