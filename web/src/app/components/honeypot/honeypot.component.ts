import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { valueOf } from '@utils/forms.util';

@Component({
  selector: 'rc-honeypot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './honeypot.component.html',
  styleUrl: './honeypot.component.scss',
})
export class HoneypotComponent {
  /** Id of the hidden input; must be unique on the page. */
  readonly key = input.required<string>();
  /** Whatever a bot typed into the hidden field. Real visitors leave it empty. */
  readonly value = model('');

  protected readonly valueOf = valueOf;
}
