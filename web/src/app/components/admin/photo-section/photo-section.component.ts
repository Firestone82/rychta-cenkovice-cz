import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { Photo } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { PhotoCardComponent } from './photo-card/photo-card.component';

@Component({
  selector: 'rc-photo-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, PhotoCardComponent],
  templateUrl: './photo-section.component.html',
  styleUrl: './photo-section.component.scss',
})
export class PhotoSectionComponent {
  /** Unique name of the row, used for element ids. */
  readonly key = input.required<string>();
  /** Name of the category or apartment. */
  readonly heading = input.required<string>();
  /** Photos of the row in display order. */
  readonly photos = input.required<Photo[]>();
  /** Whether the photos are shown; a collapsed row renders none, so none are downloaded. */
  readonly open = model(true);
  /** Upload progress text of this row; replaces the label of its upload button. */
  readonly progress = input('');
  /** An upload is running somewhere on the page; disables the upload button. */
  readonly busy = input(false);
  /** Image files the owner picked for this row. */
  readonly files = output<File[]>();
  /** The owner wants to edit the description of a photo. */
  readonly edit = output<Photo>();
  /** Id of a photo that was deleted on the server. */
  readonly removed = output<number>();

  protected readonly t = inject(I18nService).t;

  protected pick(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length) this.files.emit(files);
  }
}
