import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { L10n } from '@models/api.model';
import { LABEL_PRESETS } from '@models/apartment-options.model';
import { I18nService } from '@services/i18n.service';
import { MAX_LABELS } from '@utils/apartment-draft.util';
import { valueOf } from '@utils/forms.util';

@Component({
  selector: 'rc-apartment-label-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './apartment-label-list.component.html',
  styleUrl: './apartment-label-list.component.scss',
})
export class ApartmentLabelListComponent {
  /** Bilingual labels in display order; at most `MAX_LABELS`. */
  readonly labels = model.required<L10n[]>();
  /** Validation message for the whole list. */
  readonly error = input<string | undefined>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly presets = LABEL_PRESETS;
  protected readonly max = MAX_LABELS;
  protected readonly value = valueOf;

  protected has(cs: string): boolean {
    return this.labels().some((l) => l.cs.trim().toLowerCase() === cs.toLowerCase());
  }

  protected add(label: L10n): void {
    if (this.labels().length < MAX_LABELS) this.labels.update((list) => [...list, { ...label }]);
  }

  protected edit(index: number, lang: keyof L10n, text: string): void {
    this.labels.update((list) => list.map((l, i) => (i === index ? { ...l, [lang]: text } : l)));
  }

  protected remove(index: number): void {
    this.labels.update((list) => list.filter((_, i) => i !== index));
  }
}
