import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HomeAerialComponent } from '@components/home-aerial/home-aerial.component';
import { HomeCtaComponent } from '@components/home-cta/home-cta.component';
import { HomeHeroComponent } from '@components/home-hero/home-hero.component';
import { HomeHouseComponent } from '@components/home-house/home-house.component';
import { HomeSpacesComponent } from '@components/home-spaces/home-spaces.component';
import { HomeSurroundingsComponent } from '@components/home-surroundings/home-surroundings.component';
import { HomeWelcomeComponent } from '@components/home-welcome/home-welcome.component';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HomeHeroComponent,
    HomeWelcomeComponent,
    HomeHouseComponent,
    HomeSpacesComponent,
    HomeAerialComponent,
    HomeSurroundingsComponent,
    HomeCtaComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  constructor() {
    inject(SeoService).page(null);
  }
}
