import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-cookie-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './cookie-bar.component.html',
  styleUrl: './cookie-bar.component.scss',
})
export class CookieBarComponent {
  /** The site loads third-party content (hCaptcha), so the text mentions it. */
  readonly external = input(false);
  /** The visitor allowed everything. */
  readonly accept = output<void>();
  /** The visitor allowed only what the site needs to work. */
  readonly necessary = output<void>();
  /** The visitor wants to choose in the settings dialog. */
  readonly settings = output<void>();

  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);
}
