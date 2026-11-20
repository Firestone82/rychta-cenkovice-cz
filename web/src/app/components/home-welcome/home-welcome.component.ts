import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@directives/reveal.directive';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-home-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './home-welcome.component.html',
  styleUrl: './home-welcome.component.scss',
})
export class HomeWelcomeComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);
}
