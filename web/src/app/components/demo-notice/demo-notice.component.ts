import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEMO } from '@config/demo.config';
import { I18nService } from '@services/i18n.service';

/** Band under the navigation of the showcase build saying that nothing is really sent or saved. */
@Component({
  selector: 'rc-demo-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './demo-notice.component.html',
  styleUrl: './demo-notice.component.scss',
})
export class DemoNoticeComponent {
  /** Which part of the application the band sits in; the website also links to the administration. */
  readonly place = input<'site' | 'admin'>('site');

  protected readonly shown = DEMO;
  protected readonly t = inject(I18nService).t;
}
