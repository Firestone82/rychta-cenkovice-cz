import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { valueOf } from '@utils/forms.util';

@Component({
  selector: 'rc-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field' },
  templateUrl: './text-field.component.html',
  styleUrl: './text-field.component.scss',
})
export class TextFieldComponent {
  /** Id of the control; the message element gets `<key>-msg`. Must be unique on the page. */
  readonly key = input.required<string>();
  /** Visible label of the control. */
  readonly label = input.required<string>();
  /** Any `<input type>`, or `textarea`. */
  readonly type = input<string>('text');
  /** Text of the control. */
  readonly value = model('');
  /** Validation message; shown instead of the hint and marks the control invalid. */
  readonly error = input<string | null | undefined>(null);
  /** Help text under the control. */
  readonly hint = input<string | null>(null);
  /** Text after the label of a field that may stay empty, e.g. "optional". */
  readonly optional = input<string | null>(null);
  /** Sets the native `required` attribute. */
  readonly required = input(false);
  /** Disables the control. */
  readonly disabled = input(false);
  /** Native `autocomplete` token. */
  readonly autocomplete = input<string | null>(null);
  /** Native `inputmode` hint for on-screen keyboards. */
  readonly inputmode = input<string | null>(null);
  /** Native placeholder text. */
  readonly placeholder = input<string | null>(null);
  /** Language of the content, when it differs from the page. */
  readonly lang = input<string | null>(null);
  /** Native `min` of a number or date input. */
  readonly min = input<string | number | null>(null);
  /** Native `max` of a number or date input. */
  readonly max = input<string | number | null>(null);
  /** Native `step` of a number input. */
  readonly step = input<string | number | null>(null);
  /** Longest accepted text. */
  readonly maxlength = input<number | null>(null);
  /** Height of a textarea in lines. */
  readonly rows = input(4);
  /** Lets a textarea shrink to its `rows` instead of the default minimum height. */
  readonly compact = input(false);

  protected readonly valueOf = valueOf;
}
