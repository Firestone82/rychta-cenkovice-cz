import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  /** What is about to happen, as a question. */
  question: string;
  /** Label of the button that goes ahead. */
  action: string;
  answer: (yes: boolean) => void;
}

/** Asks the owner to confirm an action in a window of the site; `rc-confirm-outlet` shows it. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(question: string, action: string): Promise<boolean> {
    this.request()?.answer(false);
    return new Promise((resolve) =>
      this.request.set({
        question,
        action,
        answer: (yes) => {
          this.request.set(null);
          resolve(yes);
        },
      }),
    );
  }
}
