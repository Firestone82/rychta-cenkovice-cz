import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n/i18n';
import { Links } from '../../core/links';
import { Seo } from '../../core/seo';

@Component({
  selector: 'rc-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="wrap box">
      <svg viewBox="0 0 200 120" aria-hidden="true" focusable="false">
        <path class="post" d="M98 30h4v84h-4z" />
        <path class="board" d="M40 36h104l16 12-16 12H40z" />
        <path class="stripe" d="M52 42h14v12H52z" />
        <path class="ground" d="M20 114h160" />
      </svg>
      <h1 class="h1">{{ t().notFound.title }}</h1>
      <p class="lead">{{ t().notFound.text }}</p>
      <p class="actions">
        <a class="btn" [routerLink]="links.to('home')">{{ t().notFound.home }}</a>
        <a class="btn btn-ghost" [routerLink]="links.to('accommodation')">{{
          t().nav.accommodation
        }}</a>
      </p>
    </div>
  `,
  styles: `
    .box {
      display: grid;
      gap: 20px;
      justify-items: start;
      padding-block: clamp(40px, 8vw, 110px) var(--section);
    }
    svg {
      width: clamp(150px, 20vw, 220px);
    }
    .post {
      fill: var(--slate);
    }
    .board {
      fill: var(--white);
      stroke: var(--slate);
      stroke-width: 2.5;
      stroke-linejoin: round;
    }
    .stripe {
      fill: var(--timber);
    }
    .ground {
      stroke: var(--line-strong);
      stroke-width: 2.5;
      stroke-linecap: round;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }
  `,
})
export class NotFoundPage {
  protected readonly links = inject(Links);
  protected readonly t = inject(I18n).t;

  constructor() {
    const seo = inject(Seo);
    seo.page(this.t().notFound.title);
  }
}
