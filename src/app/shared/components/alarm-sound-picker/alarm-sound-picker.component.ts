import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { AlarmSoundId, AlarmSoundService, BUILT_IN_SOUNDS, ToneId } from '../../../core/services/alarm-sound.service';
import { LanguageService } from '../../../core/services/language.service';

/** Value of the dropdown entry that opens the file picker instead of selecting a sound. */
const CHOOSE_SONG = '__choose-song';

/** Picks the reminder sound: none, a built-in tone, or the user's own song (saved on this device). */
@Component({
  selector: 'app-alarm-sound-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <label
        for="alarm-sound-select"
        class="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">music_note</span>
        {{ t().alarmSound }}
      </label>
      <div class="flex items-center gap-2">
        <!-- Plain native dropdown (its own arrow only), like the time pickers above. -->
        <select
          #soundSelect
          id="alarm-sound-select"
          [value]="sound.soundId()"
          (change)="onSelect(soundSelect, fileInput)"
          class="flex-1 min-w-0 px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors">
          @for (option of options(); track option.value) {
            <option [value]="option.value" [selected]="option.value === sound.soundId()">{{ option.label }}</option>
          }
        </select>
        <button
          type="button"
          [disabled]="sound.soundId() === 'none'"
          (click)="sound.togglePreview(sound.soundId())"
          [attr.aria-label]="sound.previewing() ? t().stopSound : t().playSound"
          [title]="sound.previewing() ? t().stopSound : t().playSound"
          class="shrink-0 w-10 h-10 rounded-xl border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          <span class="material-symbols-outlined text-[22px]">{{ sound.previewing() ? 'stop_circle' : 'play_circle' }}</span>
        </button>
      </div>
      @if (sound.soundId() === 'custom') {
        <button
          type="button"
          (click)="fileInput.click()"
          class="mt-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer">
          {{ t().changeSong }}
        </button>
      }
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
    const labels: Record<ToneId, string> = { chime: t.soundChime, bell: t.soundBell, digital: t.soundDigital };
    const song = this.sound.songName();
    return [
      { value: 'none', label: t.soundNone },
      ...BUILT_IN_SOUNDS.map((id) => ({ value: id as string, label: labels[id] })),
      ...(song ? [{ value: 'custom', label: `${t.soundMySong}: ${song}` }] : []),
      { value: CHOOSE_SONG, label: t.chooseSongOption }
    ];
  });

  onSelect(select: HTMLSelectElement, fileInput: HTMLInputElement): void {
    this.sound.stop();
    if (select.value === CHOOSE_SONG) {
      // Keep showing the current sound until a file is actually chosen.
      select.value = this.sound.soundId();
      fileInput.click();
      return;
    }
    this.message.set(null);
    this.sound.selectSound(select.value as AlarmSoundId);
  }

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
