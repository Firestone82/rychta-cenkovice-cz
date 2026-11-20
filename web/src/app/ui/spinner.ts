import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The loading indicator: boards being laid into the gable, one after another. */
@Component({
  selector: 'rc-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `
    <svg viewBox="0 0 48 34" aria-hidden="true">
      <path class="roof" d="M3 32 24 2 45 32" />
      <path class="b b1" d="M11.5 32 24 14.2 36.5 32" />
      <path class="b b2" d="M19.5 32 24 25.6 28.5 32" />
    </svg>
    <span [class.sr-only]="!showLabel()">{{ label() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--slate-2);
      font-weight: 500;
    }
    svg {
      width: var(--spinner, 44px);
      height: auto;
      fill: none;
      stroke: var(--timber);
      stroke-width: 2.4;
      overflow: visible;
    }
    .b {
      stroke-dasharray: 46;
      stroke-dashoffset: 46;
      animation: lay 1.5s cubic-bezier(0.6, 0, 0.2, 1) infinite;
    }
    .b2 {
      animation-delay: 0.2s;
    }
    @keyframes lay {
      0% {
        stroke-dashoffset: 46;
      }
      45%,
      65% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: -46;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .b {
        animation: none;
        stroke-dashoffset: 0;
      }
    }
  `,
})
export class Spinner {
  readonly label = input.required<string>();
  readonly showLabel = input(true);
}
