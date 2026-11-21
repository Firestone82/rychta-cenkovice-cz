import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  model,
} from '@angular/core';
import { SITE } from '@config/site.config';
import { IconComponent } from '@components/icon/icon.component';
import { I18nService } from '@services/i18n.service';
import { valueOf } from '@utils/forms.util';
import { joinPhone, type PhoneParts, splitPhone } from '@utils/phone.util';

const COUNTRIES = SITE.contact.phoneCountries;
/** The API accepts 25 characters; the longest dialling code and its space take five. */
const NUMBER_LENGTH = 20;

@Component({
  selector: 'rc-phone-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'field' },
  templateUrl: './phone-field.component.html',
  styleUrl: './phone-field.component.scss',
})
export class PhoneFieldComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  /** Id of the number input; the message element gets `<key>-msg`. Must be unique on the page. */
  readonly key = input.required<string>();
  /** Visible label of the field. */
  readonly label = input.required<string>();
  /** The whole number with its dialling code, e.g. `+420 606 734 911`; empty without a number. */
  readonly value = model('');
  /** Validation message; marks the field invalid. */
  readonly error = input<string | null | undefined>(null);
  /** Text after the label of a field that may stay empty, e.g. "optional". */
  readonly optional = input<string | null>(null);
  /** Sets the native `required` attribute. */
  readonly required = input(false);
  /** Shows the used and the allowed length under the right end of the field. */
  readonly counter = input(false);

  protected readonly maxlength = NUMBER_LENGTH;
  protected readonly valueOf = valueOf;

  /** Follows `value` when it is set from outside and keeps the chosen country while it is empty. */
  protected readonly parts = linkedSignal<string, PhoneParts>({
    source: this.value,
    computation: (value, previous) => {
      const current = previous?.value ?? { dial: COUNTRIES[0].dial, number: '' };
      if (value === joinPhone(current)) return current;
      const split = splitPhone(value, COUNTRIES);
      return { dial: split.dial ?? current.dial, number: split.number };
    },
  });

  protected readonly options = computed(() => {
    const names = new Intl.DisplayNames([this.i18n.lang()], { type: 'region' });
    return COUNTRIES.map((c) => ({ ...c, name: names.of(c.code) ?? c.code }));
  });
  protected readonly country = computed(
    () => COUNTRIES.find((c) => c.dial === this.parts().dial) ?? COUNTRIES[0],
  );

  protected choose(dial: string): void {
    this.apply({ dial, number: this.parts().number });
  }

  /** A number typed or filled in with its dialling code also selects the country. */
  protected type(text: string): void {
    const split = splitPhone(text, COUNTRIES);
    this.apply({ dial: split.dial ?? this.parts().dial, number: split.number });
  }

  private apply(parts: PhoneParts): void {
    this.parts.set(parts);
    this.value.set(joinPhone(parts));
  }
}
