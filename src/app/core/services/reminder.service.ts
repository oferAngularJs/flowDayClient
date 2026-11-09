import { Injectable, NgZone, effect, inject } from '@angular/core';
import { TaskService } from './task.service';
import { ToastService } from './toast.service';
import { LanguageService } from './language.service';
import { TaskItem } from '../models/task.model';
import { timeToMinutes } from '../utils/date';

export const REMINDER_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_REMINDER_MINUTES = 15;

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
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  private readonly zone = inject(NgZone);

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

  private async notify(task: TaskItem): Promise<void> {
    const body = this.lang.t('reminderStartsIn', { minutes: task.reminderMinutes ?? DEFAULT_REMINDER_MINUTES });
    this.toast.show(`⏰ ${task.title}`, body);

    // A synced task already gets Google Calendar's own alert; don't notify twice.
    if (task.googleEventId) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options: NotificationOptions = {
      body,
      icon: 'assets/icons/icon-192.png',
      badge: 'assets/icons/icon-192.png',
      tag: `flowday-${task.id}`
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
}
