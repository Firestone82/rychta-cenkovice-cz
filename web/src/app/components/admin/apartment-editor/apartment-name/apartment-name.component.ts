import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import type { L10n } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

const NAME_LENGTH = 60;

@Component({
  selector: 'rc-apartment-name',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent],
  templateUrl: './apartment-name.component.html',
  styleUrl: './apartment-name.component.scss',
})
export class ApartmentNameComponent {
  /** The apartment's own name in both languages; empty when it only has a number. */
  readonly name = model.required<L10n>();
  /** Number of the apartment, for the example in the hint. */
  readonly number = input.required<number>();
  /** Validation message of the name. */
  readonly error = input<string | null | undefined>(null);
  /** Prefix of control ids, unique per apartment. */
  readonly prefix = input.required<string>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly maxlength = NAME_LENGTH;

  protected set(change: Partial<L10n>): void {
    this.name.update((name) => ({ ...name, ...change }));
  }
}
