import { Injectable, computed, signal } from '@angular/core';
import type { Apartment } from '@models/api.model';

export interface TimelineSelection {
  /** The apartments from the row the drag started on to the row it reached. */
  apartments: Apartment[];
  /** First picked day: the arrival. */
  from: string;
  /** Last picked day: the departure. Equal to `from` until the pointer leaves the first day. */
  to: string;
}

interface Point {
  apartment: Apartment;
  iso: string;
}

/** The days being picked by dragging over the timeline, shared by the rows of all its months. */
@Injectable()
export class TimelineSelectionStore {
  /** The rows of the timeline from top to bottom, which tells what lies between two of them. */
  readonly rows = signal<Apartment[]>([]);
  private readonly anchor = signal<Point | null>(null);
  private readonly head = signal<Point | null>(null);

  readonly selection = computed<TimelineSelection | null>(() => {
    const anchor = this.anchor();
    const head = this.head();
    if (!anchor || !head) return null;
    const [from, to] = [anchor.iso, head.iso].sort();
    const at = (point: Point) => this.rows().findIndex((row) => row.id === point.apartment.id);
    const [first, last] = [at(anchor), at(head)].sort((a, b) => a - b);
    const apartments = first < 0 ? [anchor.apartment] : this.rows().slice(first, last + 1);
    return { apartments, from, to };
  });

  begin(apartment: Apartment, iso: string): void {
    this.anchor.set({ apartment, iso });
    this.head.set({ apartment, iso });
  }

  extend(apartment: Apartment, iso: string): void {
    if (this.anchor()) this.head.set({ apartment, iso });
  }

  /** Ends the drag and returns what was picked. */
  finish(): TimelineSelection | null {
    const picked = this.selection();
    this.anchor.set(null);
    this.head.set(null);
    return picked;
  }
}
