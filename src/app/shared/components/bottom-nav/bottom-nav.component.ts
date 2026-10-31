import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';

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
        class="flex flex-col items-center justify-center font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150 cursor-pointer"
        [class.text-primary]="activeView() === 'dashboard'"
        [class.text-on-surface-variant]="activeView() !== 'dashboard'">
        <span
          class="material-symbols-outlined text-[20px]"
          [class.material-symbols-fill]="activeView() === 'dashboard'">
          dashboard
        </span>
        <span>{{ langService.translations().navDashboard }}</span>
      </button>

      <!-- Tab 2: Tasks -->
      <button
        type="button"
        (click)="tabChange.emit('tasks')"
        class="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150 cursor-pointer">
        <span class="material-symbols-outlined text-[20px]">check_circle</span>
        <span>{{ langService.translations().navTasks }}</span>
      </button>

      <!-- Tab 3: Planner -->
      <button
        type="button"
        (click)="tabChange.emit('planner')"
        class="flex flex-col items-center justify-center font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150 cursor-pointer"
        [class.text-primary]="activeView() === 'planner'"
        [class.text-on-surface-variant]="activeView() !== 'planner'">
        <span
          class="material-symbols-outlined text-[20px]"
          [class.material-symbols-fill]="activeView() === 'planner'">
          date_range
        </span>
        <span>{{ langService.translations().navPlanner }}</span>
      </button>

      <!-- Tab 4: AI Assistant -->
      <button
        type="button"
        (click)="tabChange.emit('ai')"
        class="flex flex-col items-center justify-center font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150 cursor-pointer"
        [class.text-primary]="activeView() === 'planner'"
        [class.text-on-surface-variant]="activeView() !== 'planner'">
        <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
        <span>{{ langService.translations().navAi }}</span>
      </button>

      <!-- Tab 5: Analytics -->
      <button
        type="button"
        (click)="tabChange.emit('analytics')"
        class="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant font-label-sm text-label-sm gap-0.5 active:scale-95 transition-transform duration-150 cursor-pointer">
        <span class="material-symbols-outlined text-[20px]">insights</span>
        <span>{{ langService.translations().navAnalytics }}</span>
      </button>
    </nav>
  `
})
export class BottomNavComponent {
  readonly langService = inject(LanguageService);
  readonly activeView = input.required<'dashboard' | 'planner'>();
  readonly tabChange = output<NavTab>();
}
