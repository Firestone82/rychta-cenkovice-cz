import { Injectable, computed, signal } from '@angular/core';
import type { Apartment } from '@models/api.model';

export interface TimelineSelection {
  apartment: Apartment;
  /** First picked day: the arrival. */
  from: string;
  /** Last picked day: the departure. Equal to `from` until the pointer leaves the first day. */
  to: string;
}

/** The days being picked by dragging over the timeline, shared by the rows of all its months. */
@Injectable()
export class TimelineSelectionStore {
  private readonly anchor = signal<{ apartment: Apartment; iso: string } | null>(null);
  private readonly head = signal('');

  readonly selection = computed<TimelineSelection | null>(() => {
    const anchor = this.anchor();
    if (!anchor) return null;
    const [from, to] = [anchor.iso, this.head()].sort();
    return { apartment: anchor.apartment, from, to };
  });

  begin(apartment: Apartment, iso: string): void {
    this.anchor.set({ apartment, iso });
    this.head.set(iso);
  }

  extend(iso: string): void {
    if (this.anchor()) this.head.set(iso);
  }

  /** Ends the drag and returns what was picked. */
  finish(): TimelineSelection | null {
    const picked = this.selection();
    this.anchor.set(null);
    return picked;
  }
}
