import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import { I18nService } from '@services/i18n.service';
import type { ApartmentTexts } from '@utils/apartment-draft.util';

@Component({
  selector: 'rc-apartment-texts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent],
  templateUrl: './apartment-texts.component.html',
  styleUrl: './apartment-texts.component.scss',
})
export class ApartmentTextsComponent {
  /** Language these texts are written in. */
  readonly lang = input.required<'cs' | 'en'>();
  /** Description, layout, features and note in `lang`. */
  readonly texts = model.required<ApartmentTexts>();
  /** Prefix of control ids, unique per apartment. */
  readonly prefix = input.required<string>();
  /** Validation message for the description. */
  readonly descriptionError = input<string | undefined>();

  protected readonly t = inject(I18nService).t;

  protected set(change: Partial<ApartmentTexts>): void {
    this.texts.update((v) => ({ ...v, ...change }));
  }
}
