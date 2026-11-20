import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { SITE } from '@config/site.config';
import { I18nService } from '@services/i18n.service';
import { bundled } from '@utils/images.util';

@Component({
  selector: 'rc-home-aerial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './home-aerial.component.html',
  styleUrl: './home-aerial.component.scss',
})
export class HomeAerialComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly video = SITE.media.aerialVideo;
  protected readonly poster = bundled(this.video.poster)?.src ?? '';
  protected readonly playing = signal(false);
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');

  protected toggleVideo(): void {
    const el = this.player()?.nativeElement;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }
}
