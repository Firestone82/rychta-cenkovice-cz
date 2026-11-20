import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n } from '../core/i18n/i18n';

/** The three steps of a booking, an actual sequence, hence numbered. */
@Component({
  selector: 'rc-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol>
      @for (step of t().steps; track step.title; let i = $index) {
        <li>
          <span class="n num" aria-hidden="true">{{ i + 1 }}</span>
          <h3 class="h3">{{ step.title }}</h3>
          <p>{{ step.text }}</p>
        </li>
      }
    </ol>
  `,
  styles: `
    ol {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 32px clamp(24px, 4vw, 56px);
      counter-reset: none;
    }
    li {
      position: relative;
      padding-top: 18px;
      border-top: 3px solid currentColor;
    }
    /* the roofline continues from one step to the next */
    li:not(:last-child)::after {
      content: '';
      position: absolute;
      top: -9px;
      right: -8px;
      width: 14px;
      height: 14px;
      border-top: 3px solid currentColor;
      border-right: 3px solid currentColor;
      rotate: 45deg;
    }
    .n {
      display: block;
      font-size: clamp(3.4rem, 6vw, 5rem);
      line-height: 0.9;
      color: var(--timber);
    }
    :host-context(.section-dark) .n {
      color: #f0b2a6;
    }
    h3 {
      margin: 10px 0 8px;
    }
    p {
      max-width: 26em;
      color: var(--slate-2);
    }
    :host-context(.section-dark) p {
      color: #c4cdd2;
    }
    @media (max-width: 760px) {
      ol {
        grid-template-columns: 1fr;
      }
      li:not(:last-child)::after {
        display: none;
      }
    }
  `,
})
export class Steps {
  protected readonly t = inject(I18n).t;
}
