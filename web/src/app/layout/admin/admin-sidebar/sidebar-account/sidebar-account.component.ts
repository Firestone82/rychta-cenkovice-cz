import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';

/** The signed-in account, linked to its page, with the sign-out under it. */
@Component({
  selector: 'rc-sidebar-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './sidebar-account.component.html',
  styleUrl: './sidebar-account.component.scss',
})
export class SidebarAccountComponent {
  protected readonly auth = inject(AuthService);
  protected readonly t = inject(I18nService).t;

  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/admin/login']);
  }
}
