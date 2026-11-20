import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PicComponent } from '@components/pic/pic.component';
import { RevealDirective } from '@directives/reveal.directive';
import type { Photo } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-home-spaces',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PicComponent, RevealDirective],
  templateUrl: './home-spaces.component.html',
  styleUrl: './home-spaces.component.scss',
})
export class HomeSpacesComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);
  private readonly covers = signal<Record<string, Photo>>({});

  protected readonly spaces = computed(() => {
    const s = this.t().spaces;
    const covers = this.covers();
    return [
      { page: 'commonRoom' as const, content: s.commonRoom, photo: covers['common-room'] },
      { page: 'wellness' as const, content: s.wellness, photo: covers['wellness'] },
      { page: 'facilities' as const, content: s.facilities, photo: covers['facilities'] },
    ];
  });

  constructor() {
    inject(ApiService)
      .photoCovers()
      .then(
        (covers) => this.covers.set(covers),
        () => undefined,
      );
  }
}
