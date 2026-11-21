import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ModalComponent } from '@components/admin/modal/modal.component';
import {
  type SelectOption,
  SelectFieldComponent,
} from '@components/select-field/select-field.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import type { Account, AccountInput, UserRole } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';
import { toFailure } from '@utils/api-failure.util';
import { TEXT_LIMITS } from '@utils/forms.util';

const ROLES: UserRole[] = ['viewer', 'staff', 'admin'];
const MIN_PASSWORD_LENGTH = 12;

/** A window that creates an account or edits one. */
@Component({
  selector: 'rc-user-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, TextFieldComponent, SelectFieldComponent],
  templateUrl: './user-editor.component.html',
  styleUrl: './user-editor.component.scss',
})
export class UserEditorComponent {
  /** Account to edit; `null` creates a new one. */
  readonly user = input<Account | null>(null);
  /** The account is the signed-in one: its role and password are not changed here. */
  readonly own = input(false);
  /** The account as stored after it was created or saved. */
  readonly saved = output<Account>();
  /** The administrator closed the window without saving. */
  readonly closed = output<void>();

  protected readonly t = inject(I18nService).t;
  protected readonly limits = TEXT_LIMITS;
  protected readonly name = linkedSignal(() => this.user()?.name ?? '');
  protected readonly email = linkedSignal(() => this.user()?.email ?? '');
  protected readonly role = linkedSignal<string>(() => this.user()?.role ?? 'staff');
  protected readonly password = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly saving = signal(false);
  protected readonly roles = computed<SelectOption[]>(() =>
    ROLES.map((value) => ({ value, label: this.t().admin.users.roles[value] })),
  );

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving() || !this.valid()) return;
    const user = this.user();
    const body: AccountInput = { name: this.name().trim(), email: this.email().trim() };
    if (!this.own()) body.role = this.role() as UserRole;
    if (this.password()) body.password = this.password();

    this.saving.set(true);
    try {
      const stored = user
        ? await this.api.updateUser(user.id, body)
        : await this.api.createUser(body);
      this.toasts.show(user ? this.t().admin.users.saved : this.t().admin.users.created);
      this.saved.emit(stored);
    } catch (err) {
      this.report(toFailure(err).fields);
    } finally {
      this.saving.set(false);
    }
  }

  private valid(): boolean {
    const text = this.t();
    const errors: Record<string, string> = {};
    if (!this.name().trim()) errors['name'] = text.errors.required;
    if (!this.email().trim()) errors['email'] = text.errors.required;
    const needed = !this.user() || this.password() !== '';
    if (needed && this.password().length < MIN_PASSWORD_LENGTH) {
      errors['password'] = text.admin.account.tooShort;
    }
    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  /** Field errors of the API in the words of the form; anything else as a toast. */
  private report(fields: Record<string, string>): void {
    const text = this.t();
    const errors: Record<string, string> = {};
    if (fields['email']) {
      errors['email'] =
        fields['email'] === 'taken' ? text.admin.users.taken : text.errors.invalid_email;
    }
    if (fields['name']) errors['name'] = text.errors.required;
    if (fields['password']) errors['password'] = text.admin.account.tooShort;
    this.errors.set(errors);
    if (!Object.keys(errors).length) this.toasts.show(text.admin.common.error, 'error');
  }
}
