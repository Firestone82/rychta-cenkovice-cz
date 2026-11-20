import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './steps.component.html',
  styleUrl: './steps.component.scss',
})
export class StepsComponent {
  protected readonly t = inject(I18nService).t;
}
