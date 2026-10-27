import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProposedPlanTask } from '../../../../core/models/planner.model';
import { PriorityBadgeComponent } from '../../../../shared/components/priority-badge/priority-badge.component';

@Component({
  selector: 'app-proposed-tasks',
  standalone: true,
  imports: [PriorityBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between px-0.5">
        <h2 class="text-headline-sm font-headline-sm text-on-surface">
          Proposed Tasks ({{ tasks().length }})
        </h2>
        <span class="text-label-sm font-label-sm text-on-surface-variant">
          Selected {{ selectedCount() }} of {{ tasks().length }}
        </span>
      </div>

      @for (task of tasks(); track task.id) {
        <div
          (click)="toggleTaskSelection.emit(task.id)"
          class="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/40 flex items-start gap-3 cursor-pointer hover:bg-surface-container-low/50 transition-colors">
          <input
            [checked]="task.selected"
            (click)="$event.stopPropagation(); toggleTaskSelection.emit(task.id)"
            class="mt-0.5 rounded border-outline text-primary focus:ring-primary h-4 w-4"
            type="checkbox" />
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-1">
              <p class="text-body-md font-medium text-on-surface leading-tight">{{ task.title }}</p>
              <app-priority-badge [priority]="task.priority" />
            </div>
            <div class="flex items-center gap-2 mt-1 text-on-surface-variant text-label-sm">
              <span class="font-code-sm text-code-sm">{{ task.durationLabel }}</span>
              <span>•</span>
              <span>{{ task.dateLabel }}</span>
              <span>•</span>
              <span class="text-primary font-medium">{{ task.tag }}</span>
            </div>
          </div>
        </div>
      }
    </div>

    <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <button
        type="button"
        (click)="adjustFilters.emit()"
        class="px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-label-md text-label-md active:scale-95 transition-transform text-center sm:flex-1">
        Adjust Filters
      </button>
      <button
        type="button"
        (click)="acceptPlan.emit()"
        class="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform sm:flex-[2]">
        <span class="material-symbols-outlined text-[16px]">auto_awesome</span>
        <span>Accept Plan & Add {{ selectedCount() }} Tasks</span>
      </button>
    </div>
  `
})
export class ProposedTasksComponent {
  readonly tasks = input.required<ProposedPlanTask[]>();
  readonly selectedCount = input.required<number>();
  readonly toggleTaskSelection = output<string>();
  readonly adjustFilters = output<void>();
  readonly acceptPlan = output<void>();
}
