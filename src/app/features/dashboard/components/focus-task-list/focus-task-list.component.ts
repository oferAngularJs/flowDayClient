import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TaskItem } from '../../../../core/models/task.model';
import { PriorityBadgeComponent } from '../../../../shared/components/priority-badge/priority-badge.component';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-focus-task-list',
  standalone: true,
  imports: [PriorityBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="today-focus-section" class="space-y-2">
      <div class="flex items-center justify-between px-0.5">
        <h2 class="text-headline-sm font-headline-sm text-on-surface flex items-center gap-1.5">
          <span>{{ langService.translations().todaysFocus }}</span>
          <span class="text-label-sm font-label-sm text-on-surface-variant font-normal">
            ({{ pendingTasks().length }} {{ langService.translations().pending }})
          </span>
        </h2>
        <button
          type="button"
          (click)="sortByTime.emit()"
          class="text-label-sm font-label-sm text-primary cursor-pointer hover:underline">
          {{ langService.translations().sortByTime }}
        </button>
      </div>

      @for (task of pendingTasks(); track task.id) {
        <div
          [id]="'task-card-' + task.id"
          class="bg-surface-container-lowest p-3 rounded-xl border transition-all duration-300"
          [class.ring-2]="highlightedTaskId() === task.id"
          [class.ring-error]="highlightedTaskId() === task.id && task.isOverdue"
          [class.ring-primary]="highlightedTaskId() === task.id && !task.isOverdue"
          [class.border-error]="task.isOverdue"
          [class.border-outline-variant]="!task.isOverdue"
          [class.hover:bg-surface-container-low]="true">
          <div class="flex items-start gap-3">
            <button
              type="button"
              (click)="toggleTask.emit(task.id)"
              class="mt-0.5 w-4 h-4 rounded border border-outline hover:border-primary flex items-center justify-center transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[12px] opacity-0 hover:opacity-40">check</span>
            </button>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-1.5">
                <h3 class="text-body-md font-medium text-on-surface leading-tight truncate flex-1">{{ task.title }}</h3>
                <div class="flex items-center gap-1.5 shrink-0">
                  @if (task.isOverdue) {
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-error/15 text-error border border-error/30 flex items-center gap-0.5">
                      <span class="material-symbols-outlined text-[11px]">warning</span>
                      {{ langService.translations().overdueBadge }}
                    </span>
                  }
                  <app-priority-badge [priority]="task.priority" />
                  <button
                    type="button"
                    (click)="editTask.emit(task)"
                    class="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                    [title]="langService.translations().editTask">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-1.5 text-on-surface-variant text-label-sm font-label-sm">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">schedule</span>
                  {{ task.scheduledStart }} - {{ task.scheduledEnd }}
                </span>
                <span>•</span>
                <span class="font-code-sm text-code-sm">{{ task.durationLabel }}</span>
                <span>•</span>
                <span class="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] flex items-center gap-1 font-medium">
                  <span class="material-symbols-outlined text-[12px]">{{ getCategoryIcon(task.category) }}</span>
                  {{ getCategoryLabel(task.category) }}
                </span>
                @if (task.totalSubtasks) {
                  <span>•</span>
                  <span class="flex items-center gap-0.5" [class.text-primary]="task.priority === 'URGENT'">
                    <span class="material-symbols-outlined text-[13px]">splitscreen</span>
                    {{ task.completedSubtasks }}/{{ task.totalSubtasks }} {{ langService.translations().subtasks }}
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
      }

      @for (doneTask of completedTasks(); track doneTask.id) {
        <div
          [id]="'task-card-' + doneTask.id"
          class="bg-surface-container-lowest/60 p-2.5 rounded-xl border border-outline-variant/20 opacity-70 group hover:opacity-100 transition-opacity">
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="toggleTask.emit(doneTask.id)"
              class="w-4 h-4 rounded bg-primary text-on-primary flex items-center justify-center cursor-pointer">
              <span class="material-symbols-outlined text-[12px]">check</span>
            </button>
            <span class="text-body-sm line-through text-on-surface-variant truncate flex-1">{{ doneTask.title }}</span>
            <span class="text-label-sm text-on-surface-variant font-code-sm">{{ langService.translations().done }}</span>
            <button
              type="button"
              (click)="editTask.emit(doneTask)"
              class="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              [title]="langService.translations().editTask">
              <span class="material-symbols-outlined text-[15px]">edit</span>
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class FocusTaskListComponent {
  readonly langService = inject(LanguageService);
  readonly pendingTasks = input.required<TaskItem[]>();
  readonly completedTasks = input.required<TaskItem[]>();
  readonly highlightedTaskId = input<string | null>(null);
  readonly toggleTask = output<string>();
  readonly sortByTime = output<void>();
  readonly editTask = output<TaskItem>();

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      work: 'business_center',
      personal: 'person',
      engineering: 'terminal',
      design: 'palette',
      product: 'rocket_launch',
      operations: 'tune'
    };
    return map[cat?.toLowerCase()] || 'folder';
  }

  getCategoryLabel(cat: string): string {
    const key = (cat || '').toLowerCase();
    const t = this.langService.translations();
    switch (key) {
      case 'personal':
        return t.personal;
      case 'work':
        return t.work;
      case 'engineering':
        return t.engineering;
      case 'design':
        return t.design;
      case 'product':
        return t.product;
      case 'operations':
        return t.operations;
      default:
        return cat;
    }
  }
}
