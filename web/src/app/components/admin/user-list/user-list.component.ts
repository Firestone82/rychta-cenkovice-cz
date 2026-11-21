import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { Account } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { BusyDirective } from '@directives/busy.directive';

/** Table of the accounts of the administration. */
@Component({
  selector: 'rc-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusyDirective, IconComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent {
  /** Accounts in display order. */
  readonly users = input.required<Account[]>();
  /** Id of the signed-in account; its row is marked and cannot be deleted. */
  readonly ownId = input<number | null>(null);
  /** Id of the account that is being deleted. */
  readonly busyId = input<number | null>(null);
  /** The administrator wants to edit this account. */
  readonly edit = output<Account>();
  /** The administrator wants to delete this account. */
  readonly remove = output<Account>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
