import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PhotoGalleryComponent } from '@components/photo-gallery/photo-gallery.component';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-gallery-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoGalleryComponent],
  templateUrl: './gallery.page.html',
  styleUrl: './gallery.page.scss',
})
export class GalleryPage {
  protected readonly t = inject(I18nService).t;

  constructor() {
    inject(SeoService).page(this.t().gallery.title, this.t().gallery.lead);
  }
}
