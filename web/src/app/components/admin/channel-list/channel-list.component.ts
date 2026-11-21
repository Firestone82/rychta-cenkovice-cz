import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { Apartment, Channel } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

/** An apartment with its portal calendar, when one is connected. */
export interface ChannelRow {
  apartment: Apartment;
  channel: Channel | null;
}

/** Table of the apartments with the state of their portal calendars. */
@Component({
  selector: 'rc-channel-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './channel-list.component.html',
  styleUrl: './channel-list.component.scss',
})
export class ChannelListComponent {
  /** Every apartment, in display order. */
  readonly rows = input.required<ChannelRow[]>();
  /** Id of the calendar being read right now; its buttons wait. */
  readonly busyId = input<number | null>(null);
  /** The administrator wants to connect the calendar of this apartment or change its address. */
  readonly edit = output<ChannelRow>();
  /** The administrator wants this calendar read now. */
  readonly sync = output<Channel>();
  /** The administrator wants this calendar disconnected. */
  readonly disconnect = output<ChannelRow>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
