import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { LogoComponent } from '@components/logo/logo.component';
import { SITE } from '@config/site.config';
import type { Lang } from '@models/i18n.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { filter } from 'rxjs';

@Component({
  selector: 'rc-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LogoComponent, IconComponent],
  host: { '(window:scroll)': 'onScroll()', '(document:keydown.escape)': 'menuOpen.set(false)' },
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  /** routerLink commands of the current page in every language, for the language switch. */
  readonly alternates = input.required<Record<Lang, string[]>>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
  protected readonly languages = SITE.languages;

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  protected readonly nav = computed(() => {
    const n = this.t().nav;
    return [
      { page: 'accommodation' as const, label: n.accommodation },
      { page: 'leisure' as const, label: n.leisure },
      { page: 'gallery' as const, label: n.gallery },
      { page: 'availability' as const, label: n.availability },
      { page: 'contact' as const, label: n.contact },
    ];
  });

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.menuOpen.set(false));
    effect(() => {
      document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  protected onScroll(): void {
    const scrolled = window.scrollY > 8;
    if (scrolled !== this.scrolled()) this.scrolled.set(scrolled);
  }
}
