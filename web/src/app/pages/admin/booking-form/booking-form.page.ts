import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  effect,
  inject,
  input,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingEditorComponent } from '@components/admin/booking-editor/booking-editor.component';
import { BookingEditorStore } from '@components/admin/booking-editor/booking-editor.store';
import { BookingSourceMessageComponent } from '@components/admin/booking-editor/booking-source-message/booking-source-message.component';
import { IconComponent } from '@components/icon/icon.component';
import { SkeletonComponent } from '@components/admin/skeleton/skeleton.component';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

/**
 * Creates or edits a booking by hand: a guest's stay (for example one agreed by phone
 * or taken from a contact-form message) or a block of dates.
 */
@Component({
  selector: 'rc-admin-booking-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IconComponent,
    SkeletonComponent,
    BookingEditorComponent,
    BookingSourceMessageComponent,
  ],
  providers: [BookingEditorStore],
  templateUrl: './booking-form.page.html',
  styleUrl: './booking-form.page.scss',
})
export class BookingFormPage implements OnInit {
  /** Route parameter; absent for a new booking. */
  readonly id = input<string>();

  protected readonly store = inject(BookingEditorStore);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  private readonly route = inject(ActivatedRoute);

  constructor() {
    const seo = inject(SeoService);
    effect(() => seo.noIndex(this.store.title()));
  }

  ngOnInit(): void {
    void this.store.init(Number(this.id()), this.route.snapshot.queryParamMap);
  }
}
