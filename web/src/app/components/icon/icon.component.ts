import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS = {
  bed: 'M3 18v-7a2 2 0 0 1 2-2h6v5h10v4M3 14h18M21 18v-5a3 3 0 0 0-3-3h-7M7 9V7',
  area: 'M4 4h16v16H4zM4 9h3M4 14h3M9 20v-3M14 20v-3',
  stairs: 'M3 20h5v-5h5v-5h5V5h3',
  users:
    'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.8M15.5 4.2a3 3 0 0 1 0 5.6',
  phone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M4 12.5l5 5L20 6.5',
  menu: 'M3 7h18M3 12h18M3 17h18',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 5v14M17 5v14',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  access: 'M12 4.5a1.5 1.5 0 1 0 0-.010M8 9h8M12 9v5l3 5M12 14H9a4 4 0 1 0 3.5 6',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z',
  logout: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  home: 'M3 11 12 3l9 8M5 9.5V20h14V9.5',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M8.5 9.5a1 1 0 1 0 0-.010',
  key: 'M14.5 9.5a4 4 0 1 0-5 5L3 21h4v-3h3v-3l1.5-1.5a4 4 0 0 0 3-4zM16 8h.010',
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'rc-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  /** Which drawing to show. */
  readonly name = input.required<IconName>();
  /** Accessible name; without it the icon is decorative and hidden from screen readers. */
  readonly label = input('');
  protected readonly d = computed(() => PATHS[this.name()]);
}
