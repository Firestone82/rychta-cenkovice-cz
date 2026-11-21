import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import type { UserRole } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

/** From the role that may do the least to the one that may do everything. */
const ROLES: UserRole[] = ['viewer', 'staff', 'admin'];

/** The roles as a list to pick from, each on its own row with what it may do. */
@Component({
  selector: 'rc-role-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-picker.component.html',
  styleUrl: './role-picker.component.scss',
})
export class RolePickerComponent {
  /** The picked role. */
  readonly value = model.required<UserRole>();
  /** Caption of the list. */
  readonly label = input.required<string>();

  protected readonly t = inject(I18nService).t;
  protected readonly roles = ROLES;
}
