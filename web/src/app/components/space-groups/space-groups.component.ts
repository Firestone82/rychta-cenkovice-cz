import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SpaceContent } from '@models/i18n.model';

@Component({
  selector: 'rc-space-groups',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './space-groups.component.html',
  styleUrl: './space-groups.component.scss',
})
export class SpaceGroupsComponent {
  /** Titled lists of what the space offers. */
  readonly groups = input.required<SpaceContent['groups']>();
}
