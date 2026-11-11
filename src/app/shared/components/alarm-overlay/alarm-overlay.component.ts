import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReminderService } from '../../../core/services/reminder.service';
import { LanguageService } from '../../../core/services/language.service';

/** Full-screen ringing alarm for a task reminder; the sound keeps playing until Stop. */
@Component({
  selector: 'app-alarm-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (reminders.ringing(); as alarm) {
      <div
        class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 p-6 bg-primary text-on-primary text-center"
        role="alertdialog"
        aria-live="assertive"
        [attr.aria-label]="alarm.title">
        <div class="relative w-28 h-28 flex items-center justify-center">
          <span class="absolute inset-0 rounded-full bg-on-primary/20 animate-ping"></span>
          <span class="relative w-24 h-24 rounded-full bg-on-primary/15 flex items-center justify-center">
            <span class="material-symbols-outlined text-[56px] wiggle">alarm</span>
          </span>
        </div>

        <div class="space-y-1 max-w-sm">
          <p class="text-[28px] font-bold leading-tight break-words">{{ alarm.title }}</p>
          <p class="text-[17px] opacity-90">{{ lang.t('reminderStartsIn', { minutes: alarm.minutes }) }}</p>
          <p class="text-[14px] opacity-75">{{ alarm.timeLabel }}</p>
        </div>

        <button
          type="button"
          (click)="reminders.stopAlarm()"
          class="w-40 h-40 rounded-full bg-on-primary text-primary text-[22px] font-bold shadow-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer">
          <span class="material-symbols-outlined text-[40px]">stop_circle</span>
          {{ lang.translations().alarmStop }}
        </button>

        @if (moreCount() > 0) {
          <p class="text-[13px] opacity-80">{{ lang.t('alarmMore', { count: moreCount() }) }}</p>
        }
      </div>
    }
  `,
  styles: [
    `
      .wiggle {
        animation: wiggle 0.6s ease-in-out infinite;
      }
      @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-14deg); }
        75% { transform: rotate(14deg); }
      }
    `
  ]
})
export class AlarmOverlayComponent {
  readonly reminders = inject(ReminderService);
  readonly lang = inject(LanguageService);
  readonly moreCount = computed(() => this.reminders.queueLength() - 1);
}
