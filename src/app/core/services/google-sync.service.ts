import { Injectable, NgZone, computed, effect, inject, signal, untracked } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';
import { GoogleApiError, GoogleApiService, GoogleCalendarEvent, GoogleTask } from './google-api.service';
import { TaskService } from './task.service';
import { ToastService } from './toast.service';
import { LanguageService } from './language.service';
import { TaskItem } from '../models/task.model';
import { localDateKey, timeToMinutes } from '../utils/date';

/** A Google Calendar event shown read-only on the dashboard. */
export interface CalendarDayEvent {
  id: string;
  title: string;
  timeLabel: string;
  allDay: boolean;
  link?: string;
}

const COMPLETED_PREFIX = '✓ ';
/** Google Calendar's gray ("Graphite") color, used for completed tasks. */
const COMPLETED_COLOR_ID = '8';

function needsSync(task: TaskItem): boolean {
  return (task.revision ?? 0) > (task.googleSyncedRevision ?? 0);
}

function isTimed(task: TaskItem): boolean {
  return timeToMinutes(task.scheduledStart) !== null && timeToMinutes(task.scheduledEnd) !== null;
}

function isNotFound(err: unknown): boolean {
  return err instanceof GoogleApiError && (err.status === 404 || err.status === 410);
}

/** "YYYY-MM-DDTHH:mm:00" for a local date + minutes since midnight (may roll into the next day). */
function localDateTime(dateKey: string, minutes: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setMinutes(minutes);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${localDateKey(date)}T${hh}:${mm}:00`;
}

/**
 * Two-way bridge between Flowday tasks and Google while the app is open:
 * - pushes changed tasks to Google Calendar (timed tasks) or Google Tasks (untimed tasks);
 * - loads the selected day's Google Calendar events for display.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSyncService {
  private readonly auth = inject(GoogleAuthService);
  private readonly api = inject(GoogleApiService);
  private readonly taskService = inject(TaskService);
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  private readonly zone = inject(NgZone);

  /** Whether Google Calendar/Tasks can be reached right now (valid token). */
  readonly hasAccess = this.auth.hasGoogleAccess;
  readonly isSyncing = signal<boolean>(false);
  readonly dayEvents = signal<CalendarDayEvent[]>([]);
  readonly isLoadingEvents = signal<boolean>(false);

  /** Number of tasks with changes not yet pushed to Google. */
  readonly pendingCount = computed(() => this.taskService.allTasks().filter(needsSync).length);

  private readonly inFlight = new Set<string>();
  private eventsRequestId = 0;
  private errorShownForRun = false;

  constructor() {
    // Push changed tasks whenever tasks change or Google access becomes available.
    effect(() => {
      const hasAccess = this.auth.hasGoogleAccess();
      const dirty = this.taskService.allTasks().filter(needsSync);
      if (hasAccess && dirty.length > 0) {
        untracked(() => void this.pushTasks(dirty));
      }
    }, { allowSignalWrites: true });

    // Reload the day's calendar events when the date, account or access changes.
    effect(() => {
      const date = this.taskService.selectedDate();
      const hasAccess = this.auth.hasGoogleAccess();
      const uid = this.auth.currentUser()?.id ?? null;
      untracked(() => void this.loadDayEvents(date, hasAccess && !!uid));
    }, { allowSignalWrites: true });
  }

  /** Called from a user tap: gets Google access (popup if needed); sync then starts automatically. */
  async connect(): Promise<void> {
    await this.auth.ensureGoogleAccess(true);
  }

  refreshDayEvents(): void {
    void this.loadDayEvents(this.taskService.selectedDate(), this.auth.hasGoogleAccess());
  }

  // ---------- Flowday -> Google ----------

  private async pushTasks(tasks: TaskItem[]): Promise<void> {
    const todo = tasks.filter((t) => !this.inFlight.has(t.id));
    if (todo.length === 0) return;
    todo.forEach((t) => this.inFlight.add(t.id));

    this.zone.run(() => this.isSyncing.set(true));
    this.errorShownForRun = false;
    const failed = new Set<string>();
    try {
      for (const task of todo) {
        if (!this.auth.hasGoogleAccess()) break; // token expired mid-run; resume after reconnect
        try {
          await this.syncTask(task);
        } catch (err) {
          failed.add(task.id);
          this.reportSyncError(err);
        } finally {
          this.inFlight.delete(task.id);
        }
      }
    } finally {
      todo.forEach((t) => this.inFlight.delete(t.id));
      this.zone.run(() => this.isSyncing.set(this.inFlight.size > 0));
    }

    // Tasks edited while this run was in progress are still behind: sync them now.
    // Failed ones wait for the next change or reconnect, so errors don't loop.
    if (this.auth.hasGoogleAccess()) {
      const behind = this.taskService
        .allTasks()
        .filter((t) => needsSync(t) && !failed.has(t.id) && !this.inFlight.has(t.id));
      if (behind.length > 0) {
        await this.pushTasks(behind);
      }
    }
  }

  private async syncTask(task: TaskItem): Promise<void> {
    const revision = task.revision ?? 0;

    if (isTimed(task)) {
      const eventId = await this.upsertEvent(task);
      // A task that used to be untimed may still have a Google Task: remove it.
      if (task.googleTaskId) {
        await this.api.deleteTask(task.googleTaskId).catch((e) => !isNotFound(e) && console.warn(e));
      }
      await this.taskService.recordGoogleSync(task.id, revision, {
        googleEventId: eventId,
        ...(task.googleTaskId ? { googleTaskId: null } : {})
      });
    } else {
      const googleTaskId = await this.upsertGoogleTask(task);
      if (task.googleEventId) {
        await this.api.deleteEvent(task.googleEventId).catch((e) => !isNotFound(e) && console.warn(e));
      }
      await this.taskService.recordGoogleSync(task.id, revision, {
        googleTaskId,
        ...(task.googleEventId ? { googleEventId: null } : {})
      });
    }
  }

  private async upsertEvent(task: TaskItem): Promise<string> {
    const start = timeToMinutes(task.scheduledStart)!;
    let end = timeToMinutes(task.scheduledEnd)!;
    if (end <= start) end += 24 * 60; // ends after midnight
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const done = task.status === 'DONE';

    const body: Partial<GoogleCalendarEvent> & { description: string } = {
      summary: (done ? COMPLETED_PREFIX : '') + task.title,
      description: 'Created by Flowday',
      start: { dateTime: localDateTime(task.dueDate, start), timeZone },
      end: { dateTime: localDateTime(task.dueDate, end), timeZone },
      // null clears a previously set color when a task is reopened.
      colorId: (done ? COMPLETED_COLOR_ID : null) as unknown as string,
      extendedProperties: { private: { flowdayTaskId: task.id } }
    };

    if (task.googleEventId) {
      try {
        return (await this.api.patchEvent(task.googleEventId, body)).id;
      } catch (err) {
        if (!isNotFound(err)) throw err;
        // The event was deleted in Google Calendar: create it again.
      }
    }
    return (await this.api.insertEvent(body)).id;
  }

  private async upsertGoogleTask(task: TaskItem): Promise<string> {
    const done = task.status === 'DONE';
    const body: Partial<GoogleTask> & { completed?: null } = {
      title: task.title,
      notes: 'Created by Flowday',
      status: done ? 'completed' : 'needsAction',
      // Google Tasks only keeps the date part of "due".
      due: `${task.dueDate}T00:00:00.000Z`,
      ...(done ? {} : { completed: null })
    };

    if (task.googleTaskId) {
      try {
        return (await this.api.patchTask(task.googleTaskId, body)).id;
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
    }
    return (await this.api.insertTask(body)).id;
  }

  private reportSyncError(err: unknown): void {
    console.error('Google sync failed', err);
    if (err instanceof GoogleApiError && err.status === 401) return; // UI already shows "Connect"
    if (this.errorShownForRun) return;
    this.errorShownForRun = true;
    this.zone.run(() => this.toast.show(this.lang.translations().googleSyncError));
  }

  // ---------- Google -> Flowday ----------

  private async loadDayEvents(dateKey: string, enabled: boolean): Promise<void> {
    const requestId = ++this.eventsRequestId;
    if (!enabled) {
      this.zone.run(() => {
        this.dayEvents.set([]);
        this.isLoadingEvents.set(false);
      });
      return;
    }

    const dayStart = new Date(`${dateKey}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    this.zone.run(() => this.isLoadingEvents.set(true));
    try {
      const events = await this.api.listEvents(dayStart, dayEnd);
      if (requestId !== this.eventsRequestId) return; // a newer request superseded this one
      const locale = this.lang.isHebrew() ? 'he-IL' : 'en-US';
      const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

      const mapped = events
        // Flowday's own tasks are already listed as tasks; skip their mirror events.
        .filter((e) => e.status !== 'cancelled' && !e.extendedProperties?.private?.['flowdayTaskId'])
        .map<CalendarDayEvent>((e) => {
          const allDay = !e.start?.dateTime;
          const timeLabel = allDay
            ? this.lang.translations().allDay
            : `${timeFmt.format(new Date(e.start!.dateTime!))} - ${timeFmt.format(new Date(e.end!.dateTime!))}`;
          return { id: e.id, title: e.summary || '—', timeLabel, allDay, link: e.htmlLink };
        });

      this.zone.run(() => {
        this.dayEvents.set(mapped);
        this.isLoadingEvents.set(false);
      });
    } catch (err) {
      if (requestId !== this.eventsRequestId) return;
      console.error('Loading Google Calendar events failed', err);
      this.zone.run(() => {
        this.dayEvents.set([]);
        this.isLoadingEvents.set(false);
        if (!(err instanceof GoogleApiError && err.status === 401)) {
          this.toast.show(this.lang.translations().googleEventsLoadError);
        }
      });
    }
  }
}
