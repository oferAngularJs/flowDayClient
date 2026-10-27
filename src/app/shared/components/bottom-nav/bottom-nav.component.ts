import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type NavTab = 'dashboard' | 'tasks' | 'planner' | 'ai' | 'analytics';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-gutter-mobile h-16 pb-safe bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant/30 dark:border-outline/20 shadow-[0_-2px_10px_rgba(32,36,58,0.04)]">
      <!-- Tab 1: Dashboard -->
      <button
        type="button"
        (click)="tabChange.emit('dashboard')"
        class="flex flex-col items-center justify-center font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150"
        [class.text-primary]="activeView() === 'dashboard'"
        [class.text-on-surface-variant]="activeView() !== 'dashboard'">
        <span
          class="material-symbols-outlined text-[20px]"
          [class.material-symbols-fill]="activeView() === 'dashboard'">
          dashboard
        </span>
        <span>Dashboard</span>
      </button>

      <!-- Tab 2: Tasks -->
      <button
        type="button"
        (click)="tabChange.emit('tasks')"
        class="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150">
        <span class="material-symbols-outlined text-[20px]">check_circle</span>
        <span>Tasks</span>
      </button>

      <!-- Tab 3: Planner -->
      <button
        type="button"
        (click)="tabChange.emit('planner')"
        class="flex flex-col items-center justify-center font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150"
        [class.text-primary]="activeView() === 'planner'"
        [class.text-on-surface-variant]="activeView() !== 'planner'">
        <span
          class="material-symbols-outlined text-[20px]"
          [class.material-symbols-fill]="activeView() === 'planner'">
          date_range
        </span>
        <span>Planner</span>
      </button>

      <!-- Tab 4: AI Assistant -->
      <button
        type="button"
        (click)="tabChange.emit('ai')"
        class="flex flex-col items-center justify-center font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150"
        [class.text-primary]="activeView() === 'planner'"
        [class.text-on-surface-variant]="activeView() !== 'planner'">
        <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
        <span>AI Assistant</span>
      </button>

      <!-- Tab 5: Analytics -->
      <button
        type="button"
        (click)="tabChange.emit('analytics')"
        class="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150">
        <span class="material-symbols-outlined text-[20px]">insights</span>
        <span>Analytics</span>
      </button>
    </nav>
  `
})
export class BottomNavComponent {
  readonly activeView = input.required<'dashboard' | 'planner'>();
  readonly tabChange = output<NavTab>();
}
