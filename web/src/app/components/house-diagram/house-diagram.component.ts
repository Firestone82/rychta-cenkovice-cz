import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { HouseCellComponent } from './house-cell/house-cell.component';
import { HousePanelComponent } from './house-panel/house-panel.component';

/**
 * The house in section: the gable split into its three floors, each apartment a cell
 * sized by its floor area. Selecting a cell shows that apartment next to the diagram.
 */
@Component({
  selector: 'rc-house-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HouseCellComponent, HousePanelComponent],
  templateUrl: './house-diagram.component.html',
  styleUrl: './house-diagram.component.scss',
})
export class HouseDiagramComponent {
  /** Apartments to place on their floors; the first one is shown until another is selected. */
  readonly apartments = input.required<Apartment[]>();

  protected readonly t = inject(I18nService).t;
  protected readonly selectedId = signal<number | null>(null);
  protected readonly selected = computed(() => {
    const list = this.apartments();
    return list.find((a) => a.id === this.selectedId()) ?? list[0] ?? null;
  });
  protected readonly upper = computed(() =>
    [3, 2]
      .map((level) => ({ level, apartments: this.apartments().filter((a) => a.floor === level) }))
      .filter((f) => f.apartments.length > 0),
  );
  protected readonly ground = computed(() => this.apartments().filter((a) => a.floor <= 1));

  protected select(a: Apartment): void {
    this.selectedId.set(a.id);
  }
}
