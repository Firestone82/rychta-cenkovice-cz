import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n } from '../../core/i18n/i18n';
import { Seo } from '../../core/seo';

@Component({
  selector: 'rc-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().privacy.title }}</h1>
      <p class="muted">{{ t().privacy.updated }}</p>
    </header>
    <div class="wrap body">
      @for (section of t().privacy.sections; track section.title) {
        <section>
          <h2 class="h3">{{ section.title }}</h2>
          <div class="prose">
            @for (p of section.text; track p) {
              <p>{{ p }}</p>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .body {
      display: grid;
      gap: 0;
      padding-bottom: var(--section);
    }
    section {
      display: grid;
      grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
      gap: 12px clamp(24px, 5vw, 72px);
      padding: clamp(24px, 3vw, 40px) 0;
      border-top: 1px solid var(--line-strong);
    }
    section:first-child {
      border-top: 2px solid var(--slate);
    }
    @media (max-width: 760px) {
      section {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PrivacyPage {
  protected readonly t = inject(I18n).t;

  constructor() {
    inject(Seo).page(this.t().privacy.title);
  }
}
