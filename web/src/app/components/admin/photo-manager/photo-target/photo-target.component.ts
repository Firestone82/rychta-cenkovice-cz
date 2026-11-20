import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import {
  type SelectOption,
  SelectFieldComponent,
} from '@components/select-field/select-field.component';
import type { Apartment } from '@models/api.model';
import {
  PHOTO_CATEGORIES,
  type PhotoCategory,
  isPhotoCategory,
} from '@models/photo-category.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-photo-target',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SelectFieldComponent],
  templateUrl: './photo-target.component.html',
  styleUrl: './photo-target.component.scss',
})
export class PhotoTargetComponent {
  /** Category whose photos are shown and uploaded to. */
  readonly category = model.required<PhotoCategory>();
  /** Apartment the photos belong to; used only in the `apartment` category. */
  readonly apartmentId = model.required<number>();
  /** Apartments offered in the second select. */
  readonly apartments = input.required<Apartment[]>();
  /** Upload progress text; non-empty disables the upload button and replaces its label. */
  readonly progress = input('');
  /** Image files the owner picked for upload. */
  readonly files = output<File[]>();

  protected readonly t = inject(I18nService).t;
  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    PHOTO_CATEGORIES.map((value) => ({ value, label: this.t().gallery.categories[value] })),
  );
  protected readonly apartmentOptions = computed<SelectOption[]>(() =>
    this.apartments().map((a) => ({
      value: String(a.id),
      label: `${this.t().common.apartment} ${a.number}`,
    })),
  );

  protected setCategory(value: string): void {
    if (isPhotoCategory(value)) this.category.set(value);
  }

  protected pick(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length) this.files.emit(files);
  }
}
