import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  output,
} from '@angular/core';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-contact-sent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './contact-sent.component.html',
  styleUrl: './contact-sent.component.scss',
})
export class ContactSentComponent {
  /** The visitor wants to write another message. */
  readonly again = output<void>();

  protected readonly t = inject(I18nService).t;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>('.done')?.focus());
  }
}
