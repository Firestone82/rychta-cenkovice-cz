import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Label, hint and error message around one form control. The control itself is
 * projected and should carry id = `for` and aria-describedby = `for + '-msg'`.
 */
@Component({
  selector: 'rc-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field' },
  template: `
    <label [attr.for]="for()">
      {{ label() }}
      @if (optional()) {
        <span class="opt">({{ optional() }})</span>
      }
    </label>
    <ng-content />
    <div [id]="for() + '-msg'" class="msg">
      @if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    .opt {
      font-weight: 500;
      color: var(--slate-2);
    }
    .msg:empty {
      display: none;
    }
  `,
})
export class Field {
  readonly for = input.required<string>();
  readonly label = input.required<string>();
  readonly error = input<string | null | undefined>(null);
  readonly hint = input<string | null>(null);
  /** Text shown after the label of a field that may stay empty. */
  readonly optional = input<string | null>(null);
}
