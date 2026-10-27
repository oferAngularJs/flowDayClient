import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 w-[90%] max-w-sm"
      [class.opacity-0]="!toastService.toastState().visible"
      [class.-translate-y-4]="!toastService.toastState().visible"
      [class.pointer-events-none]="!toastService.toastState().visible"
      [class.opacity-100]="toastService.toastState().visible"
      [class.translate-y-0]="toastService.toastState().visible">
      <div class="bg-inverse-surface text-inverse-on-surface px-3.5 py-2.5 rounded-xl shadow-lg border border-outline/30 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="material-symbols-outlined text-secondary-fixed text-[18px] shrink-0">check_circle</span>
          <div class="truncate">
            <p class="text-label-md font-label-md truncate">{{ toastService.toastState().text }}</p>
            @if (toastService.toastState().lastEndpoint) {
              <p class="text-[10px] font-code-sm text-secondary-fixed/80 truncate">
                {{ toastService.toastState().lastEndpoint }}
              </p>
            }
          </div>
        </div>
        <button
          type="button"
          class="text-inverse-on-surface/70 hover:text-inverse-on-surface shrink-0"
          (click)="toastService.hide()">
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  `
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
