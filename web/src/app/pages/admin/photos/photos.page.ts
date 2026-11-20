import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PhotoManagerComponent } from '@components/admin/photo-manager/photo-manager.component';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-admin-photos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoManagerComponent],
  templateUrl: './photos.page.html',
  styleUrl: './photos.page.scss',
})
export class PhotosPage {
  protected readonly t = inject(I18nService).t;

  constructor() {
    inject(SeoService).noIndex(this.t().admin.photos.title);
  }
}
