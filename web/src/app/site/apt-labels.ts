import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import type { L10n } from '../core/models';

/** The owner's short labels for an apartment, such as "Good for families". */
@Component({
  selector: 'rc-apt-labels',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (labels().length) {
      <ul>
        @for (label of labels(); track $index) {
          <li>{{ i18n.pick(label) }}</li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    li {
      padding: 0.1em 0.7em;
      border: 1.5px solid var(--timber);
      border-radius: 999px;
      color: var(--timber);
      font-size: 0.85rem;
      font-weight: 700;
      line-height: 1.6;
    }
  `,
})
export class AptLabels {
  protected readonly i18n = inject(I18n);
  readonly labels = input<L10n[]>([]);
}
