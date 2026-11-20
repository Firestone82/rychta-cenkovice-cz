import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The gable mark: red timber gable with chevron boarding over the plinth. The plinth takes the text colour. */
@Component({
  selector: 'rc-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path class="gable" d="M24 2 45 32H3z" />
      <path class="board" d="M11.5 32 24 14.2 36.5 32M19.5 32 24 25.6 28.5 32" />
      <path class="plinth" d="M6 34h36v12H6z" />
      <path class="window" d="M12 37.5h6v5h-6zM30 37.5h6v5h-6z" />
    </svg>
    @if (!markOnly()) {
      <span class="word"
        ><span class="name">Rychta</span> <span class="place">Čenkovice</span></span
      >
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      color: inherit;
    }
    .mark {
      width: var(--logo-size, 40px);
      height: var(--logo-size, 40px);
      flex: none;
      overflow: visible;
    }
    .gable {
      fill: var(--timber);
    }
    .board {
      fill: none;
      stroke: var(--logo-board, var(--snow));
      stroke-width: 2.4;
    }
    .plinth {
      fill: currentColor;
    }
    .window {
      fill: var(--logo-window, var(--timber));
    }
    .word {
      font-family: var(--font-display);
      font-size: calc(var(--logo-size, 40px) * 0.7);
      line-height: 0.9;
      white-space: nowrap;
    }
    .name {
      font-weight: 800;
    }
    .place {
      font-weight: 500;
    }
  `,
})
export class Logo {
  readonly markOnly = input(false);
}
