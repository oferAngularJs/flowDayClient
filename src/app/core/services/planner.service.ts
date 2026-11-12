import { Injectable, computed, inject, signal } from '@angular/core';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { cloudFunctions } from '../firebase/firebase';
import { ToastService } from './toast.service';
import { LanguageService, TranslationDictionary } from './language.service';
import { TaskService } from './task.service';
import { GoogleAuthService } from './google-auth.service';
import { GoogleApiService } from './google-api.service';
import { DEFAULT_REMINDER_MINUTES } from './reminder.service';
import {
  BusyBlock,
  DayCapacity,
  PlanRequest,
  PlanResponse,
  PlannerDay,
  PlannerPrefs,
  ProposedPlanTask,
  WeeklyPlan
} from '../models/planner.model';
import { TaskItem } from '../models/task.model';
import { addDaysToKey, formatDuration, localDateKey, timeToMinutes } from '../utils/date';

const DAYS_AHEAD = 7;
const GOAL_KEY = 'flowday_planner_goal';
const PREFS_KEY = 'flowday_planner_prefs';
const PLAN_KEY = 'flowday_planner_plan';
const DEFAULT_PREFS: PlannerPrefs = { dayStart: '08:00', dayEnd: '21:00', maxMinutesPerDay: 180 };
const CATEGORY_LABELS: Record<string, string> = {
  personal: 'Personal',
  work: 'Work',
  engineering: 'Engineering',
  design: 'Design',
  product: 'Product',
  operations: 'Operations'
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // Storage blocked: the planner still works, it just won't remember between visits.
  }
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** "14:30" -> "02:30 PM", the format tasks are stored in. */
function to12h(t: string): string {
  const h = Number(t.slice(0, 2));
  const period = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2, '0')}:${t.slice(3, 5)} ${period}`;
}

/** Merges overlapping busy blocks so the planner and the chart see clean free time. */
function mergeBlocks(blocks: [number, number][]): [number, number][] {
  const sorted = blocks.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

type PlannerErrorKey = keyof Pick<
  TranslationDictionary,
  | 'plannerErrorDailyLimit'
  | 'plannerErrorBusy'
  | 'plannerErrorNotReady'
  | 'plannerErrorGeneric'
  | 'plannerErrorOffline'
>;

/**
 * AI weekly planner: sends the goal and the user's busy time for the next 7 days to the
 * generateWeeklyPlan Cloud Function (which asks Claude), then turns accepted sessions into tasks.
 */
@Injectable({ providedIn: 'root' })
export class PlannerService {
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  private readonly taskService = inject(TaskService);
  private readonly auth = inject(GoogleAuthService);
  private readonly googleApi = inject(GoogleApiService);

  readonly goal = signal<string>(readJson<{ v: string }>(GOAL_KEY + '_v', { v: '' }).v);
  readonly prefs = signal<PlannerPrefs>(readJson(PREFS_KEY, DEFAULT_PREFS));
  readonly plan = signal<WeeklyPlan | null>(this.loadSavedPlan());
  readonly isGenerating = signal<boolean>(false);
  readonly errorKey = signal<PlannerErrorKey | null>(null);
  /** Busy time per day used for the last plan (Flowday tasks + Google Calendar), for the chart. */
  private readonly busyByDay = signal<Map<string, [number, number][]>>(new Map());

  readonly selectedTasks = computed(() => this.plan()?.tasks.filter((t) => t.selected) ?? []);
  readonly selectedTaskCount = computed(() => this.selectedTasks().length);
  readonly usesCalendar = this.auth.hasGoogleAccess;

  /** Per-day bars: time already busy, time the selected sessions add, and the planning window. */
  readonly capacity = computed<DayCapacity[]>(() => {
    const prefs = this.prefs();
    const windowMinutes = Math.max(0, toMinutes(prefs.dayEnd) - toMinutes(prefs.dayStart));
    const busy = this.busyByDay().size ? this.busyByDay() : this.busyFromTasks();
    const selected = this.selectedTasks();
    const locale = this.lang.isHebrew() ? 'he-IL' : 'en-US';
    const today = localDateKey();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const date = addDaysToKey(today, i);
      return {
        date,
        dayLabel: new Date(`${date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short' }),
        busyMinutes: (busy.get(date) ?? []).reduce((sum, [s, e]) => sum + (e - s), 0),
        plannedMinutes: selected.filter((t) => t.date === date).reduce((sum, t) => sum + t.durationMinutes, 0),
        windowMinutes
      };
    });
  });

  readonly plannedTotalLabel = computed(() =>
    formatDuration(this.capacity().reduce((sum, d) => sum + d.plannedMinutes, 0))
  );
  readonly freeTotalLabel = computed(() =>
    formatDuration(this.capacity().reduce((sum, d) => sum + Math.max(0, d.windowMinutes - d.busyMinutes), 0))
  );

  setGoal(value: string): void {
    this.goal.set(value);
    writeJson(GOAL_KEY + '_v', { v: value });
  }

  updatePrefs(changes: Partial<PlannerPrefs>): void {
    const next = { ...this.prefs(), ...changes };
    if (toMinutes(next.dayEnd) - toMinutes(next.dayStart) < 60) return; // keep at least an hour
    this.prefs.set(next);
    writeJson(PREFS_KEY, next);
  }

  toggleTaskSelection(taskId: string): void {
    const plan = this.plan();
    if (!plan) return;
    this.savePlan({ ...plan, tasks: plan.tasks.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t)) });
  }

  clearPlan(): void {
    this.savePlan(null);
    this.busyByDay.set(new Map());
  }

  async generatePlan(): Promise<void> {
    const goal = this.goal().trim();
    if (goal.length < 3 || this.isGenerating()) return;
    if (!navigator.onLine) {
      this.errorKey.set('plannerErrorOffline');
      return;
    }

    this.isGenerating.set(true);
    this.errorKey.set(null);
    try {
      const days = await this.collectBusyTime();
      const request: PlanRequest = {
        goal,
        language: this.lang.currentLanguage() === 'HE' ? 'HE' : 'EN',
        days,
        prefs: this.prefs()
      };
      const call = httpsCallable<PlanRequest, PlanResponse>(cloudFunctions, 'generateWeeklyPlan', {
        timeout: 300_000
      });
      const { data } = await call(request);
      const createdAt = Date.now();
      this.savePlan({
        goal,
        summary: data.summary,
        warning: data.warning,
        createdAt,
        tasks: data.tasks.map((t, i) => ({
          ...t,
          id: `plan-${createdAt}-${i}`,
          durationMinutes: toMinutes(t.end) - toMinutes(t.start),
          selected: true
        }))
      });
    } catch (err) {
      console.error('Planning failed', err);
      this.errorKey.set(this.errorKeyFor(err));
    } finally {
      this.isGenerating.set(false);
    }
  }

  /** Adds the checked sessions as real tasks (with their hours and a 15-minute reminder). */
  acceptPlan(onSuccessNavigate: () => void): void {
    const chosen = this.selectedTasks();
    if (chosen.length === 0) {
      this.toast.show(this.lang.translations().toastSelectAtLeastOne);
      return;
    }
    const tasks: TaskItem[] = chosen.map((p) => ({
      id: p.id,
      title: p.title,
      priority: p.priority,
      status: 'PENDING',
      scheduledStart: to12h(p.start),
      scheduledEnd: to12h(p.end),
      durationMinutes: p.durationMinutes,
      durationLabel: formatDuration(p.durationMinutes),
      category: CATEGORY_LABELS[p.category] ?? 'Personal',
      completedSubtasks: 0,
      totalSubtasks: 0,
      dueDate: p.date,
      reminderMinutes: DEFAULT_REMINDER_MINUTES
    }));
    this.taskService.addAcceptedTasksFromPlanner(tasks);
    this.toast.show(this.lang.t('plannerAccepted', { count: tasks.length }));
    this.clearPlan();
    setTimeout(() => onSuccessNavigate(), 400);
  }

  // ---------- Free time ----------

  /** Busy blocks from unfinished, timed Flowday tasks. */
  private busyFromTasks(): Map<string, [number, number][]> {
    const map = new Map<string, [number, number][]>();
    for (const task of this.taskService.allTasks()) {
      if (task.status === 'DONE') continue;
      const s = timeToMinutes(task.scheduledStart);
      let e = timeToMinutes(task.scheduledEnd);
      if (s === null || e === null) continue;
      if (e <= s) e = 24 * 60;
      map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), [s, e]]);
    }
    return map;
  }

  /** Busy time for the next 7 days: Flowday tasks, Google Calendar events, and the part of today already gone. */
  private async collectBusyTime(): Promise<PlannerDay[]> {
    const today = localDateKey();
    const busy = this.busyFromTasks();

    if (this.auth.hasGoogleAccess()) {
      try {
        const from = new Date(`${today}T00:00:00`);
        const to = new Date(`${addDaysToKey(today, DAYS_AHEAD)}T00:00:00`);
        const events = await this.googleApi.listEvents(from, to);
        for (const e of events) {
          // Skip cancelled, all-day, and Flowday's own mirrored tasks (already counted above).
          if (e.status === 'cancelled' || !e.start?.dateTime || !e.end?.dateTime) continue;
          if (e.extendedProperties?.private?.['flowdayTaskId']) continue;
          const start = new Date(e.start.dateTime);
          const end = new Date(e.end.dateTime);
          const date = localDateKey(start);
          const s = start.getHours() * 60 + start.getMinutes();
          const sameDay = localDateKey(end) === date;
          const eMin = sameDay ? end.getHours() * 60 + end.getMinutes() : 24 * 60;
          busy.set(date, [...(busy.get(date) ?? []), [s, eMin]]);
        }
      } catch (err) {
        console.warn('Could not read Google Calendar for planning; using Flowday tasks only', err);
      }
    }

    // Nothing can be planned in the past: block today up to 15 minutes from now.
    const now = new Date();
    const nowMinutes = Math.min(24 * 60, Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 15) * 15);
    busy.set(today, [...(busy.get(today) ?? []), [0, nowMinutes]]);

    const merged = new Map<string, [number, number][]>();
    const locale = 'en-US';
    const days: PlannerDay[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const date = addDaysToKey(today, i);
      const blocks = mergeBlocks((busy.get(date) ?? []).map(([s, e]) => [s, Math.min(e, 24 * 60 - 1)]));
      merged.set(date, blocks);
      days.push({
        date,
        weekday: new Date(`${date}T00:00:00`).toLocaleDateString(locale, { weekday: 'long' }),
        busy: blocks.slice(0, 40).map(([s, e]): BusyBlock => ({ start: hhmm(s), end: hhmm(e) }))
      });
    }
    this.busyByDay.set(merged);
    return days;
  }

  /** The last plan from this device, without sessions whose day has passed. */
  private loadSavedPlan(): WeeklyPlan | null {
    try {
      const saved = JSON.parse(localStorage.getItem(PLAN_KEY) ?? 'null') as WeeklyPlan | null;
      if (!saved?.tasks) return null;
      const today = localDateKey();
      const tasks = saved.tasks.filter((t) => t.date >= today);
      return tasks.length > 0 ? { ...saved, tasks } : null;
    } catch {
      return null;
    }
  }

  private savePlan(plan: WeeklyPlan | null): void {
    this.plan.set(plan);
    writeJson(PLAN_KEY, plan);
  }

  private errorKeyFor(err: unknown): PlannerErrorKey {
    if (!navigator.onLine) return 'plannerErrorOffline';
    if (err instanceof FunctionsError) {
      if (err.message === 'daily-limit') return 'plannerErrorDailyLimit';
      if (err.code === 'functions/resource-exhausted' || err.code === 'functions/unavailable') return 'plannerErrorBusy';
      if (err.message === 'ai-not-configured' || err.code === 'functions/not-found') return 'plannerErrorNotReady';
    }
    return 'plannerErrorGeneric';
  }
}
