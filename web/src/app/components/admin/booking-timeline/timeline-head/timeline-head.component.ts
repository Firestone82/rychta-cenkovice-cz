import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TimelineDay } from '@utils/timeline.util';

@Component({
  selector: 'rc-timeline-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-head.component.html',
  styleUrl: './timeline-head.component.scss',
})
export class TimelineHeadComponent {
  /** Days of the shown month. */
  readonly days = input.required<TimelineDay[]>();
  /** ISO date marked as today. */
  readonly today = input.required<string>();
}
