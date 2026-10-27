import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DashboardStats } from '../../../../core/models/task.model';

@Component({
  selector: 'app-bento-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 gap-2.5">
      <!-- Metric 1: Tasks -->
      <div
        (click)="scrollToTodayTasks.emit()"
        class="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/40 flex flex-col justify-between cursor-pointer hover:border-primary/50 hover:bg-surface-container-low/40 transition-all group shadow-xs"
        title="Click to view today's tasks">
        <div class="flex items-center justify-between text-on-surface-variant group-hover:text-primary transition-colors">
          <span class="text-label-sm font-label-sm uppercase tracking-wider">Today's Tasks</span>
          <span class="material-symbols-outlined text-[16px]">checklist</span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <div class="flex items-baseline gap-1.5">
            <span class="text-headline-md font-headline-md text-on-surface">{{ stats().assignedToday }}</span>
            <span class="text-body-sm font-body-sm text-on-surface-variant">total</span>
          </div>
          <span class="text-[11px] font-label-sm text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            View <span class="material-symbols-outlined text-[13px]">arrow_downward</span>
          </span>
        </div>
      </div>

      <!-- Metric 2: Completed Rate -->
      <div class="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/40 flex flex-col justify-between">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span class="text-label-sm font-label-sm uppercase tracking-wider">Completed</span>
          <span class="material-symbols-outlined text-[16px] text-primary">pie_chart</span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <div class="flex items-baseline gap-1">
            <span class="text-headline-md font-headline-md text-on-surface">{{ stats().completedToday }}</span>
            <span class="text-body-sm font-body-sm text-on-surface-variant">/ {{ stats().assignedToday }}</span>
          </div>
          <span class="text-label-sm font-label-sm text-primary font-semibold">{{ stats().completionRate }}%</span>
        </div>
        <div class="w-full bg-surface-container-high h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div class="bg-primary h-full rounded-full transition-all duration-300" [style.width.%]="stats().completionRate"></div>
        </div>
      </div>

      <!-- Metric 3: Workload Left -->
      <div class="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/40 flex flex-col justify-between">
        <div class="flex items-center justify-between text-on-surface-variant">
          <span class="text-label-sm font-label-sm uppercase tracking-wider">Workload Left</span>
          <span class="material-symbols-outlined text-[16px]">timelapse</span>
        </div>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-headline-md font-headline-md text-on-surface">{{ stats().workloadLeftLabel }}</span>
          <span class="text-[11px] font-label-sm text-on-surface-variant">remaining</span>
        </div>
      </div>

      <!-- Metric 4: Overdue Warning -->
      <div
        (click)="scrollToOverdueTask.emit()"
        class="bg-surface-container-lowest p-3 rounded-xl border flex flex-col justify-between relative overflow-hidden transition-all group"
        [class.border-error]="stats().overdueCount > 0"
        [class.hover:border-error]="stats().overdueCount > 0"
        [class.cursor-pointer]="stats().overdueCount > 0"
        [class.border-outline-variant]="stats().overdueCount === 0"
        [title]="stats().overdueCount > 0 ? 'Click to jump to overdue task' : 'No overdue tasks'">
        <div
          class="absolute -right-3 -top-3 w-10 h-10 rounded-full"
          [class.bg-error]="stats().overdueCount > 0"
          [class.opacity-15]="stats().overdueCount > 0"
          [class.bg-surface-container]="stats().overdueCount === 0"></div>
        <div class="flex items-center justify-between" [class.text-error]="stats().overdueCount > 0" [class.text-on-surface-variant]="stats().overdueCount === 0">
          <span class="text-label-sm font-label-sm uppercase tracking-wider">Overdue</span>
          <span class="material-symbols-outlined text-[16px]">{{ stats().overdueCount > 0 ? 'warning' : 'check_circle' }}</span>
        </div>
        <div class="mt-2 flex flex-col gap-0.5">
          <div class="flex flex-wrap items-baseline justify-between gap-1">
            <span class="text-headline-md font-headline-md" [class.text-error]="stats().overdueCount > 0" [class.text-on-surface]="stats().overdueCount === 0">
              {{ stats().overdueCount }} {{ stats().overdueCount === 1 ? 'task' : 'tasks' }}
            </span>
            @if (stats().overdueCount > 0) {
              <span class="text-[10px] font-label-sm bg-error/10 text-error px-1.5 py-0.5 rounded font-medium group-hover:bg-error group-hover:text-white transition-colors flex items-center gap-0.5 shrink-0">
                Jump <span class="material-symbols-outlined text-[12px]">arrow_downward</span>
              </span>
            } @else {
              <span class="text-[10px] font-label-sm bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded shrink-0">All good</span>
            }
          </div>
          @if (stats().overdueTaskTitle && stats().overdueCount > 0) {
            <p class="text-[11px] text-error font-medium truncate leading-tight mt-0.5">
              {{ stats().overdueTaskTitle }}
            </p>
          }
        </div>
      </div>
    </div>
  `
})
export class BentoStatsComponent {
  readonly stats = input.required<DashboardStats>();
  readonly scrollToTodayTasks = output<void>();
  readonly scrollToOverdueTask = output<void>();
}
