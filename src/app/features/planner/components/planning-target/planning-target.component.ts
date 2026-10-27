import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-planning-target',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 shadow-sm relative">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-1.5 text-primary text-label-sm font-label-sm font-semibold">
          <span class="material-symbols-outlined text-[16px]">flag</span>
          <span>ACTIVE PLANNING TARGET</span>
        </div>
        <button
          type="button"
          (click)="reanalyze.emit()"
          class="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors">
          <span class="material-symbols-outlined text-[14px]" [class.animate-spin]="isAnalyzing()">refresh</span>
          <span>{{ isAnalyzing() ? 'Analyzing...' : 'Re-analyze' }}</span>
        </button>
      </div>
      <p class="text-body-md font-medium text-on-surface mt-1.5 leading-snug">
        {{ targetGoal() }}
      </p>
      <div class="mt-3 pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-on-surface-variant text-label-sm font-label-sm">
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">date_range</span>
          {{ weekRange() }}
        </span>
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">sync</span>
          {{ syncStatus() }}
        </span>
      </div>
    </div>
  `
})
export class PlanningTargetComponent {
  readonly targetGoal = input.required<string>();
  readonly weekRange = input.required<string>();
  readonly syncStatus = input.required<string>();
  readonly isAnalyzing = input<boolean>(false);
  readonly reanalyze = output<void>();
}
