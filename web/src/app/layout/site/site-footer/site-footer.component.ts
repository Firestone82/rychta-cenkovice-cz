import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { LogoComponent } from '@components/logo/logo.component';
import { ThemeSwitchComponent } from '@components/theme-switch/theme-switch.component';
import { SITE } from '@config/site.config';
import { ConsentService } from '@services/consent.service';
import { I18nService } from '@services/i18n.service';
import { FooterNavComponent } from './footer-nav/footer-nav.component';

@Component({
  selector: 'rc-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent, IconComponent, FooterNavComponent, ThemeSwitchComponent],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  protected readonly consent = inject(ConsentService);
  protected readonly t = inject(I18nService).t;
  protected readonly contact = SITE.contact;
  protected readonly year = new Date().getFullYear();
}
