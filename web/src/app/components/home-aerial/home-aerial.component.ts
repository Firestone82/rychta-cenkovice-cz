import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { SITE } from '@config/site.config';
import { I18nService } from '@services/i18n.service';
import { bundled } from '@utils/images.util';

/** Safari on iPhone has its own full screen call on the video element. */
type FullScreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

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
  private readonly player = viewChild.required<ElementRef<FullScreenVideo>>('player');
  private inView = false;
  private autoplay = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.player().nativeElement;
      this.autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      const observer = new IntersectionObserver(([entry]) => {
        this.inView = entry.isIntersecting;
        this.sync();
      });
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected openFullScreen(): void {
    const el = this.player().nativeElement;
    this.play(el);
    if (el.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
    else el.webkitEnterFullscreen?.();
  }

  protected fullScreenChanged(): void {
    const el = this.player().nativeElement;
    // The browser's own controls are the only way out of full screen on a touch screen.
    el.controls = document.fullscreenElement === el;
    this.sync();
  }

  /** Plays while the video is on screen and stops it elsewhere, so it does not decode unseen. */
  private sync(): void {
    const el = this.player().nativeElement;
    if (document.fullscreenElement === el) return;
    if (this.inView && this.autoplay) this.play(el);
    else el.pause();
  }

  private play(el: HTMLVideoElement): void {
    el.muted = true;
    void el.play().catch(() => undefined);
  }
}
