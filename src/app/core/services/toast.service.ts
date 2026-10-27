import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  text: string;
  visible: boolean;
  lastEndpoint?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly toastState = signal<ToastMessage>({
    text: 'Plan synced! 5 tasks queued for review.',
    visible: false
  });

  show(text: string, lastEndpoint?: string): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.toastState.set({ text, visible: true, lastEndpoint });

    this.timeoutId = setTimeout(() => {
      this.hide();
    }, 3400);
  }

  hide(): void {
    this.toastState.update((prev) => ({ ...prev, visible: false }));
  }
}
