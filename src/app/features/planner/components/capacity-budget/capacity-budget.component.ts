import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CapacityBudget } from '../../../../core/models/planner.model';

@Component({
  selector: 'app-capacity-budget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">Capacity Budget</span>
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-headline-md font-headline-md text-on-surface">{{ capacity().plannedLabel }}</span>
            <span class="text-body-sm font-body-sm text-on-surface-variant">{{ capacity().totalFreeLabel }}</span>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-surface-container-high text-primary font-semibold flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-primary"></span>
          {{ capacity().statusLabel }}
        </span>
      </div>

      <!-- Mini Workload Distribution Bars -->
      <div class="mt-4 pt-3 border-t border-outline-variant/20">
        <div class="flex items-center justify-between text-[11px] font-label-sm text-on-surface-variant mb-2">
          <span>DAILY PLANNED WORKLOAD</span>
          <span>{{ capacity().maxDailyTarget }}</span>
        </div>
        <div class="grid grid-cols-5 gap-2 items-end h-24 pt-2">
          @for (day of capacity().dailyDistribution; track day.dayLabel) {
            <div class="flex flex-col items-center gap-1 h-full justify-end">
              <span
                class="text-[10px] font-code-sm"
                [class.font-bold]="day.isWarning"
                [class.text-on-surface-variant]="!day.isWarning"
                [style.color]="day.isWarning ? '#c2410c' : null">
                {{ day.hoursLabel }}
              </span>
              <div
                class="w-full rounded-t transition-all duration-300"
                [style.height.%]="day.percentageHeight"
                [style.backgroundColor]="day.isWarning ? '#f97316' : null"
                [class.ring-2]="day.isWarning"
                [style.--tw-ring-color]="day.isWarning ? '#fff7ed' : null"
                [class.bg-primary]="!day.isWarning"
                [class.opacity-60]="!day.isWarning"></div>
              <span
                class="text-[11px] font-label-sm"
                [class.font-bold]="day.isWarning"
                [class.text-on-surface-variant]="!day.isWarning"
                [style.color]="day.isWarning ? '#c2410c' : null">
                {{ day.dayLabel }}
              </span>
            </div>
          }
        </div>
      </div>

      <!-- Thursday Workload Warning Notice -->
      @if (capacity().warningMessage) {
        <div class="mt-3.5 p-2.5 rounded-lg bg-[#fff7ed] border border-[#ffedd5] flex items-center gap-2 text-on-surface">
          <span class="material-symbols-outlined text-[#c2410c] text-[18px]">info</span>
          <p class="text-[12px] font-body-sm text-[#9a3412] leading-tight">
            <strong>{{ capacity().warningDay }}</strong> {{ capacity().warningMessage }}
          </p>
        </div>
      }
    </div>
  `
})
export class CapacityBudgetComponent {
  readonly capacity = input.required<CapacityBudget>();
}
