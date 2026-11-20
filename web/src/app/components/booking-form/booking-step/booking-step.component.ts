import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'rc-booking-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './booking-step.component.html',
  styleUrl: './booking-step.component.scss',
})
export class BookingStepComponent {
  /** Position of the step, shown in the house-shaped badge. */
  readonly number = input.required<number>();
  /** Legend of the step. */
  readonly title = input.required<string>();
  /** Id of the fieldset, when something needs to scroll or focus into it. */
  readonly anchor = input<string | null>(null);
}
