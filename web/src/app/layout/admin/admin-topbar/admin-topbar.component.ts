import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { LogoComponent } from '@components/logo/logo.component';
import { I18nService } from '@services/i18n.service';

/** Bar with the menu button; shown only on narrow screens, where the sidebar is a drawer. */
@Component({
  selector: 'rc-admin-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LogoComponent],
  templateUrl: './admin-topbar.component.html',
  styleUrl: './admin-topbar.component.scss',
})
export class AdminTopbarComponent {
  /** Whether the navigation drawer is open; toggled by the menu button. */
  readonly open = model.required<boolean>();

  protected readonly t = inject(I18nService).t;
}
