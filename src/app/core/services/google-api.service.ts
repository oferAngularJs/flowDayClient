import { Injectable, inject } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';
/** Name of the Google Tasks list Flowday creates for untimed tasks. */
export const FLOWDAY_TASKLIST_TITLE = 'Flowday';

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Google's machine-readable reason, e.g. "insufficientPermissions" or "accessNotConfigured". */
    readonly reason: string = ''
  ) {
    super(message);
  }

  /** The user didn't grant Calendar/Tasks access on Google's consent screen. */
  get isMissingPermission(): boolean {
    return (
      this.status === 403 &&
      /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes/i.test(
        `${this.reason} ${this.message}`
      )
    );
  }

  /** The Calendar or Tasks API isn't enabled in the Google Cloud project. */
  get isApiDisabled(): boolean {
    return (
      this.status === 403 &&
      /accessNotConfigured|SERVICE_DISABLED|has not been used in project|is disabled/i.test(
        `${this.reason} ${this.message}`
      )
    );
  }
}

/** Pulls Google's error reason out of a JSON error body. */
function parseErrorReason(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { errors?: { reason?: string }[]; status?: string; details?: { reason?: string }[] };
    };
    return (
      parsed.error?.errors?.[0]?.reason ||
      parsed.error?.details?.find((d) => d.reason)?.reason ||
      parsed.error?.status ||
      ''
    );
  } catch {
    return '';
  }
}

/** Minimal shapes of the Google API resources Flowday uses. */
export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  status?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  colorId?: string;
  reminders?: { useDefault: boolean; overrides?: { method: 'popup' | 'email'; minutes: number }[] };
  extendedProperties?: { private?: Record<string, string> };
}

export interface GoogleTask {
  id: string;
  title?: string;
  notes?: string;
  status?: 'needsAction' | 'completed';
  due?: string;
}

interface GoogleTaskList {
  id: string;
  title: string;
}

/**
 * Thin client for Google Calendar and Google Tasks REST APIs, authorized with the
 * signed-in user's Google access token. A 401 marks the token invalid so the UI can reconnect.
 */
@Injectable({ providedIn: 'root' })
export class GoogleApiService {
  private readonly auth = inject(GoogleAuthService);
  private flowdayTaskListId: Promise<string> | null = null;
  private taskListOwnerUid: string | null = null;

  // ---------- Calendar ----------

  listEvents(timeMin: Date, timeMax: Date): Promise<GoogleCalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100'
    });
    return this.request<{ items?: GoogleCalendarEvent[] }>(
      `${CALENDAR_API}/calendars/primary/events?${params}`
    ).then((res) => res.items ?? []);
  }

  insertEvent(event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    return this.request(`${CALENDAR_API}/calendars/primary/events`, 'POST', event);
  }

  patchEvent(eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    return this.request(`${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, 'PATCH', event);
  }

  deleteEvent(eventId: string): Promise<void> {
    return this.request(`${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, 'DELETE');
  }

  // ---------- Tasks ----------

  async insertTask(task: Partial<GoogleTask>): Promise<GoogleTask> {
    const listId = await this.getFlowdayTaskListId();
    return this.request(`${TASKS_API}/lists/${encodeURIComponent(listId)}/tasks`, 'POST', task);
  }

  async patchTask(taskId: string, task: Partial<GoogleTask>): Promise<GoogleTask> {
    const listId = await this.getFlowdayTaskListId();
    return this.request(
      `${TASKS_API}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
      'PATCH',
      task
    );
  }

  async deleteTask(taskId: string): Promise<void> {
    const listId = await this.getFlowdayTaskListId();
    return this.request(
      `${TASKS_API}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
      'DELETE'
    );
  }

  /** Finds the "Flowday" task list, creating it the first time. */
  private getFlowdayTaskListId(): Promise<string> {
    const uid = this.auth.currentUser()?.id ?? null;
    if (uid !== this.taskListOwnerUid) {
      // Different Google account: its "Flowday" list has a different id.
      this.taskListOwnerUid = uid;
      this.flowdayTaskListId = null;
    }
    if (!this.flowdayTaskListId) {
      this.flowdayTaskListId = (async () => {
        const lists = await this.request<{ items?: GoogleTaskList[] }>(`${TASKS_API}/users/@me/lists?maxResults=100`);
        const existing = lists.items?.find((l) => l.title === FLOWDAY_TASKLIST_TITLE);
        if (existing) return existing.id;
        const created = await this.request<GoogleTaskList>(`${TASKS_API}/users/@me/lists`, 'POST', {
          title: FLOWDAY_TASKLIST_TITLE
        });
        return created.id;
      })().catch((err) => {
        this.flowdayTaskListId = null; // retry next time
        throw err;
      });
    }
    return this.flowdayTaskListId;
  }

  // ---------- HTTP ----------

  private async request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
    const token = this.auth.googleAccessToken();
    if (!token) {
      throw new GoogleApiError(401, 'No Google access token');
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error = new GoogleApiError(res.status, `${method} ${url} failed: ${res.status} ${text}`, parseErrorReason(text));
      if (res.status === 401 || error.isMissingPermission) {
        // Expired token or missing Calendar/Tasks permission: the UI offers "Connect Google Calendar" again.
        this.auth.invalidateGoogleAccess(error.isMissingPermission);
      }
      throw error;
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }
}
