import { Injectable, signal } from '@angular/core';

interface ToastItem {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<ToastItem[]>([]);
  private seq = 0;

  show(text: string, kind: 'ok' | 'error' = 'ok'): void {
    const id = ++this.seq;
    this.items.update((list) => [...list, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 7000 : 4000);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }
}
