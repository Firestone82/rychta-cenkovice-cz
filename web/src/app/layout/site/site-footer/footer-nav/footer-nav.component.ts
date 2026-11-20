import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-footer-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './footer-nav.component.html',
  styleUrl: './footer-nav.component.scss',
})
export class FooterNavComponent {
  protected readonly links = inject(LinksService);
  protected readonly t = inject(I18nService).t;
}
