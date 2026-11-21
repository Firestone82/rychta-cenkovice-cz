import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** What the loading content will look like. */
export type SkeletonKind = 'table' | 'cards' | 'list' | 'form' | 'calendar';

const DEFAULT_COUNT: Record<SkeletonKind, number> = {
  table: 6,
  cards: 6,
  list: 3,
  form: 2,
  calendar: 7,
};

/** Grey shapes in the place of content that is still loading, so the page does not jump. */
@Component({
  selector: 'rc-admin-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', '[attr.data-kind]': 'kind()' },
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  /** Layout the shapes imitate. */
  readonly kind = input<SkeletonKind>('table');
  /** Number of rows or cards; each kind has a sensible default. */
  readonly count = input<number | null>(null);
  /** What is being loaded; announced to screen readers. */
  readonly label = input.required<string>();

  protected readonly items = computed(() =>
    Array.from({ length: this.count() ?? DEFAULT_COUNT[this.kind()] }, (_, index) => index),
  );
}
