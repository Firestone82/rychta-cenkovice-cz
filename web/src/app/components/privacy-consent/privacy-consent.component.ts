import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { checkedOf } from '@utils/forms.util';

@Component({
  selector: 'rc-privacy-consent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './privacy-consent.component.html',
  styleUrl: './privacy-consent.component.scss',
})
export class PrivacyConsentComponent {
  /** Prefix of the element ids; must be unique on the page. */
  readonly key = input.required<string>();
  /** Sentence next to the checkbox; the link to the privacy policy follows it. */
  readonly label = input.required<string>();
  /** Validation message shown under the checkbox. */
  readonly error = input<string | null | undefined>(null);
  /** Whether the visitor agreed. */
  readonly checked = model(false);

  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);
  protected readonly checkedOf = checkedOf;
}
