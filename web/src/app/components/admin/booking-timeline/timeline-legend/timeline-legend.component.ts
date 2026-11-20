import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-timeline-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-legend.component.html',
  styleUrl: './timeline-legend.component.scss',
})
export class TimelineLegendComponent {
  protected readonly t = inject(I18nService).t;
}
