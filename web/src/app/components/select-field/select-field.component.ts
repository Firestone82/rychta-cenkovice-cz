import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { valueOf } from '@utils/forms.util';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'rc-select-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field' },
  templateUrl: './select-field.component.html',
  styleUrl: './select-field.component.scss',
})
export class SelectFieldComponent {
  /** Id of the control; the message element gets `<key>-msg`. Must be unique on the page. */
  readonly key = input.required<string>();
  /** Visible label of the select. */
  readonly label = input.required<string>();
  /** Options in display order. */
  readonly options = input.required<SelectOption[]>();
  /** `value` of the chosen option. */
  readonly value = model('');
  /** Validation message; shown instead of the hint and marks the control invalid. */
  readonly error = input<string | null | undefined>(null);
  /** Help text under the control. */
  readonly hint = input<string | null>(null);

  protected readonly valueOf = valueOf;
}
