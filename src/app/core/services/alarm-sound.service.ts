import { Injectable, NgZone, inject, signal } from '@angular/core';

export type AlarmSoundId = 'chime' | 'bell' | 'digital' | 'custom';
export const BUILT_IN_SOUNDS: Exclude<AlarmSoundId, 'custom'>[] = ['chime', 'bell', 'digital'];
/** Songs bigger than this are refused (they live in this device's storage). */
export const MAX_SONG_BYTES = 15 * 1024 * 1024;

const PREFS_KEY = 'flowday_alarm_sound';
const DB_NAME = 'flowday-alarm';
const DB_STORE = 'songs';
const SONG_KEY = 'custom';

interface SoundPrefs {
  soundId: AlarmSoundId;
  songName: string | null;
}

function readPrefs(): SoundPrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as SoundPrefs | null;
    if (parsed?.soundId) return parsed;
  } catch {
    // Storage blocked or corrupt: use the default.
  }
  return { soundId: 'chime', songName: null };
}

// ---------- IndexedDB: the user's song stays on this device ----------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

// ---------- Built-in tones, synthesized (no audio files to download) ----------

function tone(ctx: AudioContext, at: number, freq: number, length: number, type: OscillatorType, volume: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/** Schedules one cycle of a tone pattern; returns the cycle length in seconds. */
function playCycle(ctx: AudioContext, id: Exclude<AlarmSoundId, 'custom'>, at: number): number {
  switch (id) {
    case 'chime':
      tone(ctx, at, 659.25, 0.9, 'sine', 0.5); // E5
      tone(ctx, at + 0.25, 987.77, 1.1, 'sine', 0.45); // B5
      return 1.8;
    case 'bell':
      [880, 1760, 2640].forEach((f, i) => tone(ctx, at, f, 1.4 - i * 0.3, 'triangle', 0.4 / (i + 1)));
      return 1.6;
    case 'digital':
      for (let i = 0; i < 4; i++) tone(ctx, at + i * 0.15, 1046.5, 0.09, 'square', 0.18);
      return 1.2;
  }
}

/**
 * Plays the alarm sound: a built-in tone or the user's own song, looping until stopped.
 * Browsers only allow sound after the user has tapped the page, so the first tap "unlocks" audio.
 */
@Injectable({ providedIn: 'root' })
export class AlarmSoundService {
  private readonly zone = inject(NgZone);

  readonly soundId = signal<AlarmSoundId>(readPrefs().soundId);
  readonly songName = signal<string | null>(readPrefs().songName);
  /** Which sound is playing right now as a preview (null when none). */
  readonly previewing = signal<AlarmSoundId | null>(null);

  private ctx: AudioContext | null = null;
  private toneTimer: ReturnType<typeof setTimeout> | null = null;
  private vibrateTimer: ReturnType<typeof setInterval> | null = null;
  private readonly audio = new Audio();
  private songUrl: string | null = null;

  constructor() {
    this.audio.loop = true;
    this.audio.preload = 'auto';
    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    if (this.soundId() === 'custom') void this.loadSong();
  }

  // ---------- Choosing ----------

  selectSound(id: AlarmSoundId): void {
    if (id === 'custom' && !this.songName()) return;
    this.soundId.set(id);
    this.savePrefs();
  }

  /** Saves the chosen audio file on this device and makes it the alarm sound. */
  async setSong(file: File): Promise<'ok' | 'too-large' | 'unplayable'> {
    if (file.size > MAX_SONG_BYTES) return 'too-large';
    const playable = await new Promise<boolean>((resolve) => {
      const probe = new Audio();
      const url = URL.createObjectURL(file);
      probe.oncanplaythrough = () => resolve(true);
      probe.onerror = () => resolve(false);
      probe.src = url;
      setTimeout(() => resolve(probe.readyState >= 3), 5000);
    });
    if (!playable) return 'unplayable';

    await dbRequest('readwrite', (store) => store.put(file, SONG_KEY));
    this.zone.run(() => {
      this.songName.set(file.name.replace(/\.[^.]+$/, ''));
      this.soundId.set('custom');
      this.savePrefs();
    });
    await this.loadSong();
    return 'ok';
  }

  // ---------- Playing ----------

  /** Starts the alarm; it keeps playing until stop(). */
  start(): void {
    this.stop();
    this.play(this.soundId());
    if ('vibrate' in navigator) {
      const buzz = () => navigator.vibrate([600, 300, 600]);
      buzz();
      this.vibrateTimer = setInterval(buzz, 2500);
    }
  }

  /** Plays a sound from the picker so the user can hear it; tapping again stops it. */
  togglePreview(id: AlarmSoundId): void {
    if (this.previewing() === id) {
      this.stop();
      return;
    }
    this.stop();
    this.unlockAudio();
    this.play(id);
    this.previewing.set(id);
  }

  stop(): void {
    if (this.toneTimer) clearTimeout(this.toneTimer);
    this.toneTimer = null;
    if (this.vibrateTimer) clearInterval(this.vibrateTimer);
    this.vibrateTimer = null;
    if ('vibrate' in navigator) navigator.vibrate(0);
    this.audio.pause();
    this.previewing.set(null);
  }

  private play(id: AlarmSoundId): void {
    if (id === 'custom' && this.songUrl) {
      this.audio.currentTime = 0;
      this.audio.play().catch((err) => {
        console.warn('Playing the song failed; using the default tone', err);
        this.playTones('chime');
      });
      return;
    }
    this.playTones(id === 'custom' ? 'chime' : id);
  }

  private playTones(id: Exclude<AlarmSoundId, 'custom'>): void {
    const ctx = this.getContext();
    if (!ctx) return;
    void ctx.resume();
    const loop = () => {
      const length = playCycle(ctx, id, ctx.currentTime + 0.05);
      this.toneTimer = setTimeout(loop, length * 1000);
    };
    loop();
  }

  private getContext(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = Ctor ? new Ctor() : null;
    }
    return this.ctx;
  }

  /** Must run inside a tap: lets the page play sound later (iPhone and Chrome autoplay rules). */
  private unlockAudio(): void {
    const ctx = this.getContext();
    void ctx?.resume();
    if (this.songUrl && this.audio.paused) {
      this.audio.muted = true;
      this.audio
        .play()
        .then(() => {
          this.audio.pause();
          this.audio.muted = false;
        })
        .catch(() => (this.audio.muted = false));
    }
  }

  private async loadSong(): Promise<void> {
    try {
      const blob = await dbRequest<Blob | undefined>('readonly', (store) => store.get(SONG_KEY));
      if (!blob) return;
      if (this.songUrl) URL.revokeObjectURL(this.songUrl);
      this.songUrl = URL.createObjectURL(blob);
      this.audio.src = this.songUrl;
    } catch (err) {
      console.warn('Loading the alarm song failed', err);
    }
  }

  private savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ soundId: this.soundId(), songName: this.songName() }));
    } catch {
      // Storage blocked: the choice lasts until the page is closed.
    }
  }
}
