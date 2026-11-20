import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StepsComponent } from '@components/steps/steps.component';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-home-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepsComponent],
  templateUrl: './home-cta.component.html',
  styleUrl: './home-cta.component.scss',
})
export class HomeCtaComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);
}
