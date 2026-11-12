import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../../../core/services/language.service';
import { PlannerService } from '../../../../core/services/planner.service';
import { DayCapacity } from '../../../../core/models/planner.model';

/** 7-day bar chart: time already busy plus the time the checked sessions would add. */
@Component({
  selector: 'app-capacity-budget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40">
      <div class="flex items-start justify-between gap-2">
        <span class="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">{{ t().plannerCapacityTitle }}</span>
        <span class="text-[12px] text-on-surface-variant">
          {{ lang.t('plannerCapacityPlanned', { planned: planner.plannedTotalLabel(), free: planner.freeTotalLabel() }) }}
        </span>
      </div>

      <div class="grid grid-cols-7 gap-1.5 items-end h-28 mt-3">
        @for (day of planner.capacity(); track day.date) {
          <div class="flex flex-col items-center gap-1 h-full justify-end">
            <span class="text-[10px] font-code-sm" [class.text-primary]="day.plannedMinutes > 0" [class.text-on-surface-variant]="day.plannedMinutes === 0">
              {{ day.plannedMinutes > 0 ? hours(day.plannedMinutes) : '' }}
            </span>
            <div class="w-full flex-1 flex flex-col justify-end rounded overflow-hidden bg-surface-container-low">
              <div class="w-full bg-primary transition-all duration-300" [style.height.%]="pct(day, day.plannedMinutes)"></div>
              <div class="w-full bg-outline-variant transition-all duration-300" [style.height.%]="pct(day, day.busyMinutes)"></div>
            </div>
            <span class="text-[11px] font-label-sm text-on-surface-variant">{{ day.dayLabel }}</span>
          </div>
        }
      </div>

      <div class="mt-2.5 flex items-center gap-3 text-[11px] text-on-surface-variant">
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-outline-variant"></span>{{ t().plannerLegendBusy }}</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-primary"></span>{{ t().plannerLegendNew }}</span>
      </div>
    </div>
  `
})
export class CapacityBudgetComponent {
  readonly planner = inject(PlannerService);
  readonly lang = inject(LanguageService);
  readonly t = this.lang.translations;

  pct(day: DayCapacity, minutes: number): number {
    if (!day.windowMinutes) return 0;
    return Math.min(100, Math.round((minutes / day.windowMinutes) * 100));
  }

  hours(minutes: number): string {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  }
}
