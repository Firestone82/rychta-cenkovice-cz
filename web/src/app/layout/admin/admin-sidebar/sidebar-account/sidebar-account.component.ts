import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { BusyDirective } from '@directives/busy.directive';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';

/** The signed-in account, linked to its page, with the sign-out under it. */
@Component({
  selector: 'rc-sidebar-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, BusyDirective],
  templateUrl: './sidebar-account.component.html',
  styleUrl: './sidebar-account.component.scss',
})
export class SidebarAccountComponent {
  protected readonly auth = inject(AuthService);
  protected readonly t = inject(I18nService).t;
  protected readonly leaving = signal(false);

  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    this.leaving.set(true);
    try {
      await this.auth.logout();
      await this.router.navigate(['/admin/login']);
    } finally {
      this.leaving.set(false);
    }
  }
}
