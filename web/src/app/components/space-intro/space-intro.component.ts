import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { PicComponent } from '@components/pic/pic.component';
import type { Photo } from '@models/api.model';
import type { SpaceContent } from '@models/i18n.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-space-intro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PicComponent],
  templateUrl: './space-intro.component.html',
  styleUrl: './space-intro.component.scss',
})
export class SpaceIntroComponent {
  /** Texts of the space: headline fact and introduction. */
  readonly content = input.required<SpaceContent>();
  /** Photo beside the text; a grey placeholder keeps its place until it is known. */
  readonly cover = input<Photo>();
  /** The visitor clicked the cover photo. */
  readonly openCover = output<void>();

  protected readonly t = inject(I18nService).t;
}
