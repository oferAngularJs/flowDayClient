import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LanguageService } from '../../../../core/services/language.service';
import { PlannerService } from '../../../../core/services/planner.service';

/** Goal box, planning settings, and the "Plan my week" button. */
@Component({
  selector: 'app-planning-target',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 shadow-sm space-y-3">
      <label for="planner-goal" class="flex items-center gap-1.5 text-primary text-label-sm font-label-sm font-semibold">
        <span class="material-symbols-outlined text-[16px]">flag</span>
        {{ t().plannerGoalLabel }}
      </label>
      <textarea
        id="planner-goal"
        rows="3"
        maxlength="500"
        [value]="planner.goal()"
        (input)="planner.setGoal(goalInput.value)"
        #goalInput
        [placeholder]="t().plannerGoalPlaceholder"
        class="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary text-body-md resize-none"></textarea>

      <!-- Settings -->
      <div class="rounded-xl bg-surface-container-low/60 border border-outline-variant/30">
        <button
          type="button"
          (click)="showSettings.set(!showSettings())"
          [attr.aria-expanded]="showSettings()"
          class="w-full flex items-center justify-between px-3 py-2 text-label-md font-medium text-on-surface-variant cursor-pointer">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">tune</span>
            {{ t().plannerSettings }}
          </span>
          <span class="text-[11px] font-normal">
            {{ planner.prefs().dayStart }}–{{ planner.prefs().dayEnd }} · {{ maxLabel() }}
          </span>
        </button>
        @if (showSettings()) {
          <div class="px-3 pb-3 space-y-2.5">
            <div class="flex items-center gap-2 text-body-sm text-on-surface flex-wrap">
              <span class="text-on-surface-variant">{{ t().plannerDayWindow }}</span>
              <select
                #startSel
                [value]="planner.prefs().dayStart"
                (change)="planner.updatePrefs({ dayStart: startSel.value }); startSel.value = planner.prefs().dayStart"
                class="px-2 py-1 rounded-lg border border-outline-variant bg-surface-container-lowest">
                @for (h of hours; track h) {
                  <option [value]="h" [selected]="h === planner.prefs().dayStart">{{ h }}</option>
                }
              </select>
              <span class="text-on-surface-variant">{{ t().plannerTo }}</span>
              <select
                #endSel
                [value]="planner.prefs().dayEnd"
                (change)="planner.updatePrefs({ dayEnd: endSel.value }); endSel.value = planner.prefs().dayEnd"
                class="px-2 py-1 rounded-lg border border-outline-variant bg-surface-container-lowest">
                @for (h of hours; track h) {
                  <option [value]="h" [selected]="h === planner.prefs().dayEnd">{{ h }}</option>
                }
              </select>
            </div>
            <div class="flex items-center gap-2 text-body-sm text-on-surface">
              <span class="text-on-surface-variant">{{ t().plannerMaxPerDay }}</span>
              <select
                #maxSel
                [value]="planner.prefs().maxMinutesPerDay"
                (change)="planner.updatePrefs({ maxMinutesPerDay: +maxSel.value })"
                class="px-2 py-1 rounded-lg border border-outline-variant bg-surface-container-lowest">
                @for (m of maxOptions; track m) {
                  <option [value]="m" [selected]="m === planner.prefs().maxMinutesPerDay">{{ formatMinutes(m) }}</option>
                }
              </select>
            </div>
          </div>
        }
      </div>

      <button
        type="button"
        (click)="planner.generatePlan()"
        [disabled]="planner.isGenerating() || planner.goal().trim().length < 3"
        class="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
        <span class="material-symbols-outlined text-[18px]" [class.animate-spin]="planner.isGenerating()">
          {{ planner.isGenerating() ? 'progress_activity' : 'auto_awesome' }}
        </span>
        {{ planner.isGenerating() ? t().plannerGenerating : planner.plan() ? t().plannerRegenerate : t().plannerGenerate }}
      </button>

      @if (planner.isGenerating()) {
        <p class="text-[12px] text-on-surface-variant text-center">{{ t().plannerGeneratingHint }}</p>
      }
      @if (planner.errorKey(); as key) {
        <p class="text-[12px] text-error flex items-center gap-1" role="alert">
          <span class="material-symbols-outlined text-[16px]">error</span>
          {{ t()[key] }}
        </p>
      }

      <div class="pt-2 border-t border-outline-variant/30 flex items-center justify-between text-on-surface-variant text-[11px]">
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">event_available</span>
          {{ planner.usesCalendar() ? t().plannerUsesCalendar : t().plannerUsesTasksOnly }}
        </span>
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
          {{ t().plannerPoweredBy }}
        </span>
      </div>
    </div>
  `
})
export class PlanningTargetComponent {
  readonly planner = inject(PlannerService);
  private readonly lang = inject(LanguageService);
  readonly t = this.lang.translations;
  readonly showSettings = signal<boolean>(false);

  readonly hours = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`);
  readonly maxOptions = [60, 90, 120, 180, 240, 300, 360, 480];
  readonly maxLabel = computed(() => this.formatMinutes(this.planner.prefs().maxMinutesPerDay));

  formatMinutes(m: number): string {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h ${rest}m` : `${h}h`;
  }
}
