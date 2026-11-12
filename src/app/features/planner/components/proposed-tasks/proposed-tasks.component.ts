import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LanguageService } from '../../../../core/services/language.service';
import { PlannerService } from '../../../../core/services/planner.service';
import { PriorityBadgeComponent } from '../../../../shared/components/priority-badge/priority-badge.component';
import { ProposedPlanTask } from '../../../../core/models/planner.model';
import { formatDuration } from '../../../../core/utils/date';

/** The sessions Claude suggested; the user unticks what they don't want and adds the rest. */
@Component({
  selector: 'app-proposed-tasks',
  standalone: true,
  imports: [PriorityBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (planner.plan(); as plan) {
      <div class="space-y-2">
        @if (plan.summary) {
          <div class="p-3 rounded-xl bg-primary-fixed/60 text-on-primary-fixed-variant text-body-sm flex gap-2">
            <span class="material-symbols-outlined text-[18px] shrink-0">auto_awesome</span>
            <p>{{ plan.summary }}</p>
          </div>
        }
        @if (plan.warning) {
          <div class="p-2.5 rounded-xl bg-[#fff7ed] border border-[#ffedd5] text-[#9a3412] text-[12px] flex gap-2">
            <span class="material-symbols-outlined text-[#c2410c] text-[18px] shrink-0">info</span>
            <p>{{ plan.warning }}</p>
          </div>
        }

        @if (plan.tasks.length === 0) {
          <p class="p-4 text-center text-body-sm text-on-surface-variant">{{ t().plannerNothingFits }}</p>
        } @else {
          <div class="flex items-center justify-between px-0.5 pt-1">
            <h2 class="text-headline-sm font-headline-sm text-on-surface">{{ t().plannerProposed }}</h2>
            <span class="text-label-sm font-label-sm text-on-surface-variant">
              {{ lang.t('selectedOf', { selected: planner.selectedTaskCount(), total: plan.tasks.length }) }}
            </span>
          </div>

          @for (task of plan.tasks; track task.id) {
            <label
              class="bg-surface-container-lowest p-3 rounded-xl border flex items-start gap-3 cursor-pointer hover:bg-surface-container-low/50 transition-colors"
              [class.border-primary]="task.selected"
              [class.border-outline-variant]="!task.selected"
              [class.opacity-60]="!task.selected">
              <input
                type="checkbox"
                [checked]="task.selected"
                (change)="planner.toggleTaskSelection(task.id)"
                class="mt-0.5 rounded border-outline text-primary focus:ring-primary h-4 w-4" />
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-1">
                  <p class="text-body-md font-medium text-on-surface leading-tight">{{ task.title }}</p>
                  <app-priority-badge [priority]="task.priority" />
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-on-surface-variant text-label-sm">
                  <span class="flex items-center gap-0.5">
                    <span class="material-symbols-outlined text-[13px]">event</span>
                    {{ dayLabel(task) }}
                  </span>
                  <span class="flex items-center gap-0.5">
                    <span class="material-symbols-outlined text-[13px]">schedule</span>
                    {{ task.start }}–{{ task.end }}
                  </span>
                  <span class="font-code-sm text-code-sm">{{ duration(task) }}</span>
                  @if (task.step) {
                    <span class="text-primary font-medium">{{ task.step }}</span>
                  }
                </div>
              </div>
            </label>
          }
        }
      </div>

      <div class="pt-2 flex items-stretch gap-2">
        <button
          type="button"
          (click)="planner.clearPlan()"
          class="px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant font-label-md text-label-md active:scale-95 transition-transform">
          {{ t().plannerDiscard }}
        </button>
        <button
          type="button"
          (click)="acceptPlan.emit()"
          [disabled]="planner.selectedTaskCount() === 0"
          class="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-outlined text-[16px]">add_task</span>
          <span>{{ lang.t('plannerAccept', { count: planner.selectedTaskCount() }) }}</span>
        </button>
      </div>
    }
  `
})
export class ProposedTasksComponent {
  readonly planner = inject(PlannerService);
  readonly lang = inject(LanguageService);
  readonly t = this.lang.translations;
  readonly acceptPlan = output<void>();

  dayLabel(task: ProposedPlanTask): string {
    const locale = this.lang.isHebrew() ? 'he-IL' : 'en-US';
    return new Date(`${task.date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  duration(task: ProposedPlanTask): string {
    return formatDuration(task.durationMinutes);
  }
}
