import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApartmentFactsComponent } from '@components/apartment-facts/apartment-facts.component';
import { PicComponent } from '@components/pic/pic.component';
import type { Apartment, Photo } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-apartment-intro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PicComponent, ApartmentFactsComponent],
  templateUrl: './apartment-intro.component.html',
  styleUrl: './apartment-intro.component.scss',
})
export class ApartmentIntroComponent {
  /** Apartment whose summary, price and booking link are shown. */
  readonly apartment = input.required<Apartment>();
  /** Large photo beside the summary; nothing is shown without it. */
  readonly cover = input<Photo>();
  /** The visitor clicked the cover photo. */
  readonly openCover = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
}
