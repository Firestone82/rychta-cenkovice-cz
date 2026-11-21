import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import type { Message } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { BusyDirective } from '@directives/busy.directive';

@Component({
  selector: 'rc-message-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusyDirective, RouterLink, IconComponent],
  templateUrl: './message-card.component.html',
  styleUrl: './message-card.component.scss',
})
export class MessageCardComponent {
  /** Contact-form message with its sender and state. */
  readonly message = input.required<Message>();
  /** A change of this message is on its way to the server. */
  readonly busy = input(false);
  /** The owner moved the message to another state (new, read, archived). */
  readonly status = output<Message['status']>();
  /** The owner wants to delete the message; not confirmed yet. */
  readonly remove = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
