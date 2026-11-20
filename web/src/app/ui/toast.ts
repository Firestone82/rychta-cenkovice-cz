import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';

interface ToastItem {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

/** Short confirmations ("Saved.") announced politely to screen readers. */
@Injectable({ providedIn: 'root' })
export class Toasts {
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

@Component({
  selector: 'rc-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.items(); track toast.id) {
        <div class="toast" [class.is-error]="toast.kind === 'error'" role="status">
          {{ toast.text }}
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 90;
      display: grid;
      gap: 8px;
      max-width: min(420px, calc(100vw - 40px));
    }
    .toast {
      padding: 0.8em 1.1em;
      background: var(--slate);
      color: var(--white);
      border-left: 5px solid #7fc08f;
      font-weight: 500;
      animation: in 0.3s var(--ease);
    }
    .toast.is-error {
      border-left-color: #f0907f;
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
    }
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(Toasts);
}
