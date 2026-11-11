import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { AlarmSoundId, AlarmSoundService, BUILT_IN_SOUNDS } from '../../../core/services/alarm-sound.service';
import { LanguageService } from '../../../core/services/language.service';

/** Picks the reminder sound: a built-in tone or the user's own song (saved on this device). */
@Component({
  selector: 'app-alarm-sound-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p class="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">music_note</span>
        {{ t().alarmSound }}
      </p>
      <div class="space-y-1.5" role="radiogroup" [attr.aria-label]="t().alarmSound">
        @for (option of options(); track option.id) {
          <div
            class="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors"
            [class.border-primary]="sound.soundId() === option.id"
            [class.bg-primary-fixed]="sound.soundId() === option.id"
            [class.border-outline-variant]="sound.soundId() !== option.id">
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="sound.soundId() === option.id"
              (click)="option.id === 'custom' && !sound.songName() ? fileInput.click() : sound.selectSound(option.id)"
              class="flex-1 min-w-0 flex items-center gap-2 text-start cursor-pointer">
              <span
                class="w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center"
                [class.border-primary]="sound.soundId() === option.id"
                [class.border-outline]="sound.soundId() !== option.id">
                @if (sound.soundId() === option.id) {
                  <span class="w-2 h-2 rounded-full bg-primary"></span>
                }
              </span>
              <span class="material-symbols-outlined text-[18px] text-primary">{{ option.icon }}</span>
              <span class="text-body-sm font-medium text-on-surface truncate">{{ option.label }}</span>
            </button>
            @if (option.id === 'custom') {
              <button
                type="button"
                (click)="fileInput.click()"
                class="shrink-0 px-2 py-1 rounded-lg text-[11px] font-semibold text-primary hover:bg-surface-container cursor-pointer">
                {{ sound.songName() ? t().changeSong : t().chooseSong }}
              </button>
            }
            @if (option.id !== 'custom' || sound.songName()) {
              <button
                type="button"
                (click)="sound.togglePreview(option.id)"
                [attr.aria-label]="sound.previewing() === option.id ? t().stopSound : t().playSound"
                class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-primary hover:bg-surface-container cursor-pointer">
                <span class="material-symbols-outlined text-[20px]">{{ sound.previewing() === option.id ? 'stop_circle' : 'play_circle' }}</span>
              </button>
            }
          </div>
        }
      </div>
      @if (message(); as msg) {
        <p class="mt-1 text-[11px]" [class.text-error]="msg.error" [class.text-on-surface-variant]="!msg.error">{{ msg.text }}</p>
      }
      <input #fileInput type="file" accept="audio/*" class="hidden" (change)="onFile(fileInput)" />
    </div>
  `
})
export class AlarmSoundPickerComponent implements OnDestroy {
  readonly sound = inject(AlarmSoundService);
  private readonly lang = inject(LanguageService);
  readonly t = this.lang.translations;
  readonly message = signal<{ text: string; error: boolean } | null>(null);

  readonly options = computed(() => {
    const t = this.t();
    const labels: Record<Exclude<AlarmSoundId, 'custom'>, string> = {
      chime: t.soundChime,
      bell: t.soundBell,
      digital: t.soundDigital
    };
    const icons: Record<Exclude<AlarmSoundId, 'custom'>, string> = {
      chime: 'notifications_active',
      bell: 'notifications',
      digital: 'alarm'
    };
    return [
      ...BUILT_IN_SOUNDS.map((id) => ({ id: id as AlarmSoundId, label: labels[id], icon: icons[id] })),
      {
        id: 'custom' as AlarmSoundId,
        label: this.sound.songName() ? `${t.soundMySong}: ${this.sound.songName()}` : t.soundMySong,
        icon: 'library_music'
      }
    ];
  });

  async onFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.sound.stop();
    const result = await this.sound.setSong(file);
    const t = this.t();
    this.message.set(
      result === 'ok'
        ? { text: `${this.lang.t('songSaved', { name: this.sound.songName() ?? '' })} ${t.songDeviceOnly}`, error: false }
        : { text: result === 'too-large' ? t.songTooLarge : t.songUnplayable, error: true }
    );
  }

  ngOnDestroy(): void {
    // Closing the task window stops a preview that is still playing.
    if (this.sound.previewing()) this.sound.stop();
  }
}
