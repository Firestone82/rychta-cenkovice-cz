import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { checkedOf } from '@utils/forms.util';

/** One kind of cookies in the settings dialog; used as an attribute on `<li>`. */
@Component({
  selector: 'li[rcCookieKind]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cookie-kind.component.html',
  styleUrl: './cookie-kind.component.scss',
})
export class CookieKindComponent {
  /** Short id of the kind; the checkbox gets `ck-<key>-box`, its description `ck-<key>`. */
  readonly key = input.required<string>({ alias: 'rcCookieKind' });
  /** Name of the kind, shown in bold. */
  readonly name = input.required<string>();
  /** What this kind of cookies is used for. */
  readonly text = input.required<string>();
  /** Note such as "always on"; also locks the checkbox in the ticked state. */
  readonly always = input<string>();
  /** Whether the visitor allows this kind. */
  readonly checked = model(false);

  protected readonly checkedOf = checkedOf;
}
