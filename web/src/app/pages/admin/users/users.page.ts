import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { UserEditorComponent } from '@components/admin/user-editor/user-editor.component';
import { UserListComponent } from '@components/admin/user-list/user-list.component';
import { IconComponent } from '@components/icon/icon.component';
import { SkeletonComponent } from '@components/admin/skeleton/skeleton.component';
import type { Account } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { AuthService } from '@services/auth.service';
import { ConfirmService } from '@services/confirm.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-admin-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, IconComponent, UserListComponent, UserEditorComponent],
  templateUrl: './users.page.html',
})
export class UsersPage {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly items = signal<Account[] | null>(null);
  protected readonly failed = signal(false);
  /** The account in the editor; `new` for one that does not exist yet. */
  protected readonly editing = signal<Account | 'new' | null>(null);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  constructor() {
    inject(SeoService).noIndex(this.t().admin.users.title);
    this.load();
  }

  protected account(editing: Account | 'new'): Account | null {
    return editing === 'new' ? null : editing;
  }

  protected stored(user: Account): void {
    this.editing.set(null);
    this.load();
    // The sidebar shows the name and the e-mail of the session, so it is renewed.
    if (user.id === this.auth.user()?.id) void this.auth.refresh();
  }

  protected async remove(user: Account): Promise<void> {
    const text = this.t().admin.users;
    const question = this.i18n.fill(text.deleteConfirm, { name: user.name });
    if (!(await this.confirm.ask(question, text.delete))) return;
    try {
      await this.api.deleteUser(user.id);
      this.toasts.show(text.deleted);
      this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }

  private load(): void {
    this.api.users().then(
      (list) => {
        this.failed.set(false);
        this.items.set(list);
      },
      () => {
        this.failed.set(true);
        this.items.set([]);
      },
    );
  }
}
