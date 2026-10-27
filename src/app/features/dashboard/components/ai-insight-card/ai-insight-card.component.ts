import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AiInsight } from '../../../../core/models/task.model';

@Component({
  selector: 'app-ai-insight-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-container-low to-surface-container p-3.5 border border-outline-variant/40 transition-all duration-150 hover:shadow-sm">
      <div class="flex items-start gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="text-label-sm font-label-sm font-bold text-primary uppercase tracking-wide">Flowday AI Insight</span>
            <span class="text-[11px] font-code-sm text-on-surface-variant">{{ insight().timestampLabel }}</span>
          </div>
          <p class="text-body-sm font-body-sm text-on-surface mt-1 leading-snug">
            {{ insight().messagePrefix }}
            <strong class="font-medium text-on-surface">
              {{ insight().highlightedTaskTitle }} {{ insight().highlightedTaskDuration }}
            </strong>
            {{ insight().messageSuffix }}
          </p>
          <div class="mt-3 flex items-center gap-2">
            <button
              type="button"
              (click)="inspectPlanner.emit()"
              class="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-md font-label-md flex items-center gap-1.5 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[14px]">calendar_clock</span>
              <span>Inspect in AI Planner</span>
            </button>
            <button
              type="button"
              (click)="smartReschedule.emit()"
              class="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-label-md font-label-md border border-outline-variant/50 hover:bg-surface-container-high transition-colors">
              Smart Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AiInsightCardComponent {
  readonly insight = input.required<AiInsight>();
  readonly inspectPlanner = output<void>();
  readonly smartReschedule = output<void>();
}
