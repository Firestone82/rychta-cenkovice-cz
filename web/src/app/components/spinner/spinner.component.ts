import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'rc-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent {
  /** What is being loaded; announced to screen readers. */
  readonly label = input.required<string>();
  /** Shows the label next to the spinner; otherwise it is only announced. */
  readonly showLabel = input(true);
}
