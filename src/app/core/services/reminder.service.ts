import { Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import { TaskService } from './task.service';
import { AlarmSoundService } from './alarm-sound.service';
import { LanguageService } from './language.service';
import { TaskItem } from '../models/task.model';
import { timeToMinutes } from '../utils/date';

export const REMINDER_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_REMINDER_MINUTES = 15;

/** A ringing alarm stops by itself after this long, in case the phone was left alone. */
const MAX_RING_MS = 10 * 60 * 1000;

export interface RingingAlarm {
  taskId: string;
  title: string;
  minutes: number;
  timeLabel: string;
}

/** Timers further away than this are re-planned later (keeps the number of timers small). */
const PLAN_AHEAD_MS = 24 * 60 * 60 * 1000;

/** When a task's reminder should go off, or null for untimed/finished tasks. */
function reminderTime(task: TaskItem): number | null {
  if (!task.reminderMinutes || task.status === 'DONE') return null;
  const start = timeToMinutes(task.scheduledStart);
  if (start === null) return null;
  const at = new Date(`${task.dueDate}T00:00:00`);
  at.setMinutes(start - task.reminderMinutes);
  return at.getTime();
}

/**
 * "Notify me" while Flowday is open. When the app is closed, the reminder on the task's
 * Google Calendar event alerts the phone instead (set by GoogleSyncService).
 */
@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly taskService = inject(TaskService);
  private readonly sound = inject(AlarmSoundService);
  private readonly lang = inject(LanguageService);
  private readonly zone = inject(NgZone);

  /** Alarms waiting for the user to tap Stop; the first one is on screen. */
  private readonly queue = signal<RingingAlarm[]>([]);
  readonly ringing = computed(() => this.queue()[0] ?? null);
  readonly queueLength = computed(() => this.queue().length);
  private ringTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** "taskId@time" keys already shown, so a reload of the task list doesn't repeat them. */
  private readonly fired = new Set<string>();

  constructor() {
    effect(() => this.plan(this.taskService.allTasks()));
    // Re-plan every hour so tasks more than a day away get their timer eventually.
    setInterval(() => this.plan(this.taskService.allTasks()), 60 * 60 * 1000);
  }

  /** Asks for notification permission; call from a tap (browsers ignore it otherwise). */
  async requestPermission(): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    try {
      await Notification.requestPermission();
    } catch {
      // Older Safari uses a callback API; the in-app toast still works.
    }
  }

  private plan(tasks: TaskItem[]): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    const now = Date.now();

    for (const task of tasks) {
      const at = reminderTime(task);
      if (at === null || at <= now || at - now > PLAN_AHEAD_MS) continue;
      const key = `${task.id}@${at}`;
      if (this.fired.has(key)) continue;
      this.timers.set(
        task.id,
        setTimeout(() => {
          this.fired.add(key);
          this.zone.run(() => void this.notify(task));
        }, at - now)
      );
    }
  }

  /** Stops the sound and dismisses the alarm on screen; the next queued alarm (if any) rings. */
  stopAlarm(): void {
    this.sound.stop();
    if (this.ringTimeout) clearTimeout(this.ringTimeout);
    this.ringTimeout = null;
    const current = this.ringing();
    this.queue.update((q) => q.slice(1));
    if (current) void this.closeNotification(current.taskId);
    if (this.ringing()) this.startRinging();
  }

  private startRinging(): void {
    this.sound.start();
    if (this.ringTimeout) clearTimeout(this.ringTimeout);
    this.ringTimeout = setTimeout(() => this.zone.run(() => this.stopAlarm()), MAX_RING_MS);
  }

  private async notify(task: TaskItem): Promise<void> {
    const minutes = task.reminderMinutes ?? DEFAULT_REMINDER_MINUTES;
    const body = this.lang.t('reminderStartsIn', { minutes });

    // Ring in the app until the user taps Stop.
    const wasIdle = !this.ringing();
    this.queue.update((q) => [
      ...q.filter((a) => a.taskId !== task.id),
      { taskId: task.id, title: task.title, minutes, timeLabel: `${task.scheduledStart} - ${task.scheduledEnd}` }
    ]);
    if (wasIdle) this.startRinging();

    // A synced task already gets Google Calendar's own alert; don't notify twice.
    if (task.googleEventId) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options: NotificationOptions & { vibrate?: number[] } = {
      body,
      icon: 'assets/icons/icon-192.png',
      badge: 'assets/icons/icon-192.png',
      tag: `flowday-${task.id}`,
      // Plays the phone's default notification sound and stays until dismissed.
      silent: false,
      requireInteraction: true,
      vibrate: [600, 300, 600],
      // Tapping the notification opens Flowday (handled by Angular's service worker).
      data: { onActionClick: { default: { operation: 'focusLastFocusedOrOpen', url: '/dashboard' } } }
    };
    try {
      // Android only shows notifications through the service worker.
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.showNotification(task.title, options);
      } else {
        new Notification(task.title, options);
      }
    } catch (err) {
      console.warn('Showing the reminder notification failed', err);
    }
  }

  private async closeNotification(taskId: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      const open = (await registration?.getNotifications({ tag: `flowday-${taskId}` })) ?? [];
      open.forEach((n) => n.close());
    } catch {
      // Nothing to close.
    }
  }
}
