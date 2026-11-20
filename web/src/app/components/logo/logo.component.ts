import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'rc-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
})
export class LogoComponent {
  /** Shows only the gable mark, without the name next to it. */
  readonly markOnly = input(false);
}
