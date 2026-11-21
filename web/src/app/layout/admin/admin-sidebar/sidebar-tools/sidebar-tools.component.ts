import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { SITE } from '@config/site.config';
import { ADMIN_THEMES, AdminThemeService } from '@services/admin-theme.service';
import { I18nService } from '@services/i18n.service';

/** Theme and language of the administration, with the link to the public website under them. */
@Component({
  selector: 'rc-sidebar-tools',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './sidebar-tools.component.html',
  styleUrl: './sidebar-tools.component.scss',
})
export class SidebarToolsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly look = inject(AdminThemeService);
  protected readonly t = this.i18n.t;
  protected readonly themes = ADMIN_THEMES;
  protected readonly langs = SITE.languages.map((l) => l.code);
}
