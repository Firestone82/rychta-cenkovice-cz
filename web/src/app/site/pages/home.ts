import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { addDays, isISO, todayISO } from '../../core/dates';
import { I18n } from '../../core/i18n/i18n';
import { bundled } from '../../core/images';
import type { Season } from '../../core/i18n/types';
import { Links } from '../../core/links';
import type { Apartment, Photo } from '../../core/models';
import { Seo } from '../../core/seo';
import { Icon } from '../../ui/icon';
import { Lightbox } from '../../ui/lightbox';
import { Pic } from '../../ui/pic';
import { Reveal } from '../../ui/reveal';
import { Spinner } from '../../ui/spinner';
import { HouseDiagram } from '../house-diagram';
import { Signpost } from '../signpost';
import { Steps } from '../steps';

const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn'];

function currentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

@Component({
  selector: 'rc-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HouseDiagram, Signpost, Steps, Pic, Icon, Reveal, Spinner, Lightbox],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly seasons = SEASONS;
  protected readonly hero = {
    winter: bundled('hero-winter'),
    spring: bundled('hero-spring'),
    summer: bundled('hero-summer'),
    autumn: bundled('hero-autumn'),
  };
  protected readonly poster = bundled('house-aerial').src;
  protected readonly season = signal<Season>(currentSeason());
  /** Seasons whose photo has been requested; the others are not downloaded until chosen. */
  protected readonly seen = signal<Season[]>([currentSeason()]);

  protected readonly today = todayISO();
  protected readonly checkIn = signal('');
  protected readonly checkOut = signal('');
  protected readonly guests = signal(4);
  protected readonly minCheckOut = computed(() =>
    isISO(this.checkIn()) ? addDays(this.checkIn(), 1) : addDays(this.today, 1),
  );

  protected readonly apartments = signal<Apartment[] | null>(null);
  protected readonly covers = signal<Record<string, Photo>>({});
  protected readonly photos = signal<Photo[]>([]);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly nearest = computed(() => this.t().trips.slice(0, 6));

  protected readonly spaces = computed(() => {
    const s = this.t().spaces;
    const covers = this.covers();
    return [
      { page: 'commonRoom' as const, content: s.commonRoom, photo: covers['common-room'] },
      { page: 'wellness' as const, content: s.wellness, photo: covers['wellness'] },
      { page: 'facilities' as const, content: s.facilities, photo: covers['facilities'] },
    ];
  });

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  protected readonly playing = signal(false);

  constructor() {
    inject(Seo).page(null);
    this.api.apartments().then(
      (list) => this.apartments.set(list),
      () => this.apartments.set([]),
    );
    this.api.photoCovers().then(
      (covers) => this.covers.set(covers),
      () => undefined,
    );
    this.api.photos({ limit: 5, category: 'surroundings' }).then(
      (page) => this.photos.set(page.items),
      () => undefined,
    );
  }

  protected pick(season: Season): void {
    if (!this.seen().includes(season)) this.seen.update((list) => [...list, season]);
    this.season.set(season);
  }

  protected setCheckIn(value: string): void {
    this.checkIn.set(value);
    if (isISO(value) && (!isISO(this.checkOut()) || this.checkOut() <= value))
      this.checkOut.set(addDays(value, 2));
  }

  protected search(event: Event): void {
    event.preventDefault();
    const query: Record<string, string | number> = { guests: this.guests() };
    if (isISO(this.checkIn())) query['from'] = this.checkIn();
    if (isISO(this.checkOut())) query['to'] = this.checkOut();
    void this.router.navigate(this.links.to('booking'), { queryParams: query });
  }

  protected toggleVideo(): void {
    const el = this.video()?.nativeElement;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  protected number(event: Event): number {
    return Math.max(1, Math.min(40, Number((event.target as HTMLInputElement).value) || 1));
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
