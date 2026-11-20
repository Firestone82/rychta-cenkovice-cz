import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import {
  type SelectOption,
  SelectFieldComponent,
} from '@components/select-field/select-field.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import { FLAT_TYPES, FLOORS } from '@models/apartment-options.model';
import { I18nService } from '@services/i18n.service';
import type { ApartmentDraft } from '@utils/apartment-draft.util';
import { checkedOf } from '@utils/forms.util';

@Component({
  selector: 'rc-apartment-basics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent, SelectFieldComponent],
  templateUrl: './apartment-basics.component.html',
  styleUrl: './apartment-basics.component.scss',
})
export class ApartmentBasicsComponent {
  /** Editor state; this part edits price, sizes, type, floor and the two switches. */
  readonly draft = model.required<ApartmentDraft>();
  /** Validation messages keyed by API field name. */
  readonly errors = input<Record<string, string>>({});
  /** Prefix of control ids, unique per apartment. */
  readonly prefix = input.required<string>();

  protected readonly t = inject(I18nService).t;
  protected readonly checked = checkedOf;
  protected readonly flatTypes = computed<SelectOption[]>(() => [
    { value: '', label: this.t().admin.apartments.typeNone },
    ...FLAT_TYPES.map((key) => ({
      value: key,
      label: key === 'studio' ? this.t().flatTypes[key] : key,
    })),
  ]);
  protected readonly floors = computed<SelectOption[]>(() =>
    FLOORS.map((level) => ({ value: String(level), label: this.t().common.floor[level - 1] })),
  );

  protected set(change: Partial<ApartmentDraft>): void {
    this.draft.update((d) => ({ ...d, ...change }));
  }
}
