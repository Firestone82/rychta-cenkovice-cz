import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { I18nService } from '@services/i18n.service';
import { THEMES, ThemeService } from '@services/theme.service';

/** Light and dark theme as two buttons; drawn for a dark surface (sidebar, footer). */
@Component({
  selector: 'rc-theme-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './theme-switch.component.html',
  styleUrl: './theme-switch.component.scss',
  host: { role: 'group', '[attr.aria-label]': 't().theme.label' },
})
export class ThemeSwitchComponent {
  protected readonly look = inject(ThemeService);
  protected readonly t = inject(I18nService).t;
  protected readonly themes = THEMES;
}
