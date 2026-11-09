import { Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../firebase/firebase';
import { ToastService } from './toast.service';
import { LanguageService } from './language.service';
import { GoogleAuthService } from './google-auth.service';
import { CreateTaskPayload, DashboardSummary, TaskItem } from '../models/task.model';
import { formatDuration, localDateKey, timeToMinutes } from '../utils/date';

export { formatDuration };

/** Fields stored in Firestore at users/{uid}/tasks/{taskId}. Derived fields are computed client-side. */
type StoredTask = Omit<TaskItem, 'id' | 'durationLabel' | 'isOverdue'>;

const STORED_FIELDS: (keyof StoredTask)[] = [
  'title',
  'priority',
  'status',
  'scheduledStart',
  'scheduledEnd',
  'durationMinutes',
  'category',
  'completedSubtasks',
  'totalSubtasks',
  'dueDate',
  'reminderMinutes'
];

/** Old browser-only task cache from before Firestore; removed on startup. */
const LEGACY_STORAGE_KEY_TASKS = 'flowday_tasks';

function pickStored(task: Partial<TaskItem>): Partial<StoredTask> {
  const out: Partial<StoredTask> = {};
  for (const key of STORED_FIELDS) {
    if (task[key] !== undefined) {
      (out as Record<string, unknown>)[key] = task[key];
    }
  }
  return out;
}

function fromSnapshot(snap: QueryDocumentSnapshot<DocumentData>, today: string): TaskItem {
  const data = snap.data() as StoredTask;
  const durationMinutes = Number(data.durationMinutes) || 0;
  return {
    id: snap.id,
    title: data.title ?? '',
    priority: data.priority ?? 'MEDIUM',
    status: data.status ?? 'PENDING',
    scheduledStart: data.scheduledStart,
    scheduledEnd: data.scheduledEnd,
    durationMinutes,
    durationLabel: formatDuration(durationMinutes),
    category: data.category ?? 'Personal',
    completedSubtasks: data.completedSubtasks ?? 0,
    totalSubtasks: data.totalSubtasks ?? 0,
    dueDate: data.dueDate ?? today,
    isOverdue: data.status !== 'DONE' && !!data.dueDate && data.dueDate < today,
    reminderMinutes: typeof data.reminderMinutes === 'number' ? data.reminderMinutes : undefined,
    deleted: data.deleted === true,
    revision: data.revision ?? 0,
    googleSyncedRevision: data.googleSyncedRevision ?? 0,
    googleEventId: data.googleEventId,
    googleTaskId: data.googleTaskId
  };
}

export function computeDashboardStats(tasks: TaskItem[]): {
  highPriorityCount: number;
  totalWorkloadLabel: string;
  stats: DashboardSummary['stats'];
} {
  const completedList = tasks.filter((t) => t.status === 'DONE');
  const pendingList = tasks.filter((t) => t.status !== 'DONE');
  const overdueList = pendingList.filter((t) => t.isOverdue);
  const sumMinutes = (list: TaskItem[]) => list.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);

  return {
    highPriorityCount: pendingList.filter((t) => t.priority === 'HIGH' || t.priority === 'URGENT').length,
    totalWorkloadLabel: formatDuration(sumMinutes(tasks)),
    stats: {
      assignedToday: tasks.length,
      completedToday: completedList.length,
      completionRate: tasks.length > 0 ? Math.round((completedList.length / tasks.length) * 100) : 0,
      workloadLeftLabel: formatDuration(sumMinutes(pendingList)),
      overdueCount: overdueList.length,
      overdueTaskTitle: overdueList[0]?.title
    }
  };
}

/** Placeholder insight until real AI suggestions exist (not shown to signed-in users). */
const DEMO_INSIGHT: DashboardSummary['aiInsight'] = {
  id: 'insight-demo',
  timestampLabel: 'Just now',
  messagePrefix: 'Thursday is getting busy. Consider moving',
  highlightedTaskTitle: '"Review Q4 design spec"',
  highlightedTaskDuration: '(45m)',
  messageSuffix: 'to Friday to balance your focus capacity.',
  suggestedDay: 'Friday'
};

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  private readonly auth = inject(GoogleAuthService);
  private readonly zone = inject(NgZone);

  /** All of the signed-in user's tasks, kept live from Firestore. */
  readonly allTasks = signal<TaskItem[]>([]);
  /** Deleted tasks whose Google Calendar/Tasks copy still has to be removed (see GoogleSyncService). */
  readonly deletedTasks = signal<TaskItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly sortAscending = signal<boolean>(true);
  /** Day shown on the dashboard (YYYY-MM-DD, local time). */
  readonly selectedDate = signal<string>(localDateKey());

  private unsubscribe: Unsubscribe | null = null;
  private listeningUid: string | null = null;

  /** Tasks due on the selected day; when viewing today, unfinished overdue tasks are included too. */
  readonly visibleTasks = computed(() => {
    const selected = this.selectedDate();
    const today = localDateKey();
    const direction = this.sortAscending() ? 1 : -1;
    return this.allTasks()
      .filter((t) => t.dueDate === selected || (selected === today && t.isOverdue))
      .sort((a, b) => {
        // Overdue first, then by start time; tasks without a time go last.
        if (!!a.isOverdue !== !!b.isOverdue) return a.isOverdue ? -1 : 1;
        const ta = timeToMinutes(a.scheduledStart);
        const tb = timeToMinutes(b.scheduledStart);
        if (ta === null || tb === null) return ta === null ? (tb === null ? 0 : 1) : -1;
        return (ta - tb) * direction;
      });
  });

  readonly dashboardData = computed<DashboardSummary>(() => {
    const tasks = this.visibleTasks();
    const stats = computeDashboardStats(tasks);
    return {
      dateLabel: this.selectedDate(),
      sprintCode: '',
      userName: this.auth.currentUser()?.firstName ?? '',
      highPriorityCount: stats.highPriorityCount,
      totalWorkloadLabel: stats.totalWorkloadLabel,
      stats: stats.stats,
      aiInsight: DEMO_INSIGHT,
      tasks
    };
  });

  readonly pendingTasks = computed(() => this.visibleTasks().filter((t) => t.status !== 'DONE'));
  readonly completedTasks = computed(() => this.visibleTasks().filter((t) => t.status === 'DONE'));

  constructor() {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY_TASKS);
    } catch {
      // Storage unavailable; nothing to clean.
    }

    // Follow the signed-in user: start listening to their tasks, or clear on sign-out.
    effect(
      () => {
        const uid = this.auth.currentUser()?.id ?? null;
        this.listenToUser(uid);
      },
      { allowSignalWrites: true }
    );
  }

  private listenToUser(uid: string | null): void {
    if (uid === this.listeningUid) return;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeningUid = uid;
    this.allTasks.set([]);
    this.deletedTasks.set([]);

    if (!uid) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.unsubscribe = onSnapshot(
      collection(firestore, 'users', uid, 'tasks'),
      (snapshot) => {
        const today = localDateKey();
        const tasks = snapshot.docs.map((d) => fromSnapshot(d, today));
        this.zone.run(() => {
          this.allTasks.set(tasks.filter((t) => !t.deleted));
          this.deletedTasks.set(tasks.filter((t) => t.deleted));
          this.isLoading.set(false);
        });
      },
      (error) => {
        console.error('Loading tasks from Firestore failed', error);
        this.zone.run(() => {
          this.isLoading.set(false);
          this.toast.show(this.lang.translations().tasksLoadError);
        });
      }
    );
  }

  private tasksCollection() {
    const uid = this.auth.currentUser()?.id;
    return uid ? collection(firestore, 'users', uid, 'tasks') : null;
  }

  private reportSaveError(error: unknown): void {
    console.error('Saving task to Firestore failed', error);
    this.zone.run(() => this.toast.show(this.lang.translations().tasksSaveError));
  }

  toggleTaskStatus(taskId: string): void {
    const col = this.tasksCollection();
    const target = this.allTasks().find((t) => t.id === taskId);
    if (!col || !target) return;

    const newStatus = target.status === 'DONE' ? 'PENDING' : 'DONE';
    // Firestore applies the change to the local cache immediately, so the UI updates instantly.
    updateDoc(doc(col, taskId), { status: newStatus, revision: increment(1), updatedAt: serverTimestamp() }).catch((e) =>
      this.reportSaveError(e)
    );
    this.toast.show(
      newStatus === 'DONE'
        ? this.lang.t('toastTaskCompleted', { title: target.title })
        : this.lang.t('toastTaskReopened', { title: target.title })
    );
  }

  /** Returns the new task (with its id) right away; the write syncs in the background. */
  createNewTask(payload: CreateTaskPayload): TaskItem | null {
    const col = this.tasksCollection();
    if (!col) return null;

    const ref = doc(col);
    const task: TaskItem = {
      id: ref.id,
      title: payload.title,
      priority: payload.priority,
      status: 'PENDING',
      scheduledStart: payload.scheduledStart,
      scheduledEnd: payload.scheduledEnd,
      durationMinutes: payload.durationMinutes,
      durationLabel: formatDuration(payload.durationMinutes),
      category: payload.category,
      completedSubtasks: 0,
      totalSubtasks: 0,
      dueDate: payload.dueDate || localDateKey(),
      reminderMinutes: payload.reminderMinutes
    };

    setDoc(ref, {
      ...pickStored(task),
      revision: 1,
      googleSyncedRevision: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }).catch((e) => this.reportSaveError(e));
    this.toast.show(this.lang.t('toastTaskCreated', { title: task.title }));
    return task;
  }

  updateTask(taskId: string, changes: Partial<TaskItem>): void {
    const col = this.tasksCollection();
    const target = this.allTasks().find((t) => t.id === taskId);
    if (!col || !target) return;

    updateDoc(doc(col, taskId), { ...pickStored(changes), revision: increment(1), updatedAt: serverTimestamp() }).catch((e) =>
      this.reportSaveError(e)
    );
    this.toast.show(this.lang.t('toastTaskUpdated', { title: changes.title ?? target.title }));
  }

  /** Moves a task to a later day, keeping its hours. Never moves into the past. */
  moveTask(taskId: string, newDate: string): void {
    const col = this.tasksCollection();
    const target = this.allTasks().find((t) => t.id === taskId);
    if (!col || !target || !newDate || newDate === target.dueDate || newDate < localDateKey()) return;

    updateDoc(doc(col, taskId), { dueDate: newDate, revision: increment(1), updatedAt: serverTimestamp() }).catch((e) =>
      this.reportSaveError(e)
    );
    const locale = this.lang.isHebrew() ? 'he-IL' : 'en-US';
    const dateLabel = new Date(`${newDate}T00:00:00`).toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    this.toast.show(this.lang.t('toastTaskMoved', { title: target.title, date: dateLabel }));
  }

  /**
   * Deletes a task. If it has a copy in Google Calendar/Tasks it's only marked deleted here;
   * GoogleSyncService removes the Google copy and then deletes the task for good.
   */
  deleteTask(taskId: string): void {
    const col = this.tasksCollection();
    const target = this.allTasks().find((t) => t.id === taskId);
    if (!col || !target) return;

    const write =
      target.googleEventId || target.googleTaskId
        ? updateDoc(doc(col, taskId), { deleted: true, updatedAt: serverTimestamp() })
        : deleteDoc(doc(col, taskId));
    write.catch((e) => this.reportSaveError(e));
    this.toast.show(this.lang.t('toastTaskDeleted', { title: target.title }));
  }

  /** Final removal after the Google copy is gone (or never existed). */
  purgeTask(taskId: string): Promise<void> {
    const col = this.tasksCollection();
    return col ? deleteDoc(doc(col, taskId)) : Promise.resolve();
  }

  /**
   * Records that `revision` of a task was pushed to Google, plus the Google ids it got.
   * Doesn't bump `revision`, so it never triggers another sync by itself.
   */
  recordGoogleSync(
    taskId: string,
    revision: number,
    ids: { googleEventId?: string | null; googleTaskId?: string | null }
  ): Promise<void> {
    const col = this.tasksCollection();
    if (!col) return Promise.resolve();
    const update: { [field: string]: number | string | null } = { googleSyncedRevision: revision };
    if (ids.googleEventId !== undefined) update['googleEventId'] = ids.googleEventId;
    if (ids.googleTaskId !== undefined) update['googleTaskId'] = ids.googleTaskId;
    return updateDoc(doc(col, taskId), update);
  }

  /** Demo action from the AI insight card (no real rescheduling yet). */
  smartRescheduleTask(): void {
    this.toast.show(this.lang.translations().toastSmartReschedule);
  }

  /** Saves tasks accepted in the weekly planner as real tasks. */
  addAcceptedTasksFromPlanner(newTasks: TaskItem[]): void {
    const col = this.tasksCollection();
    if (!col) return;

    const batch = writeBatch(firestore);
    for (const task of newTasks) {
      batch.set(doc(col), {
        ...pickStored(task),
        revision: 1,
        googleSyncedRevision: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    batch.commit().catch((e) => this.reportSaveError(e));
  }

  toggleSortOrder(): void {
    this.sortAscending.update((v) => !v);
    this.toast.show(
      this.sortAscending()
        ? this.lang.translations().toastSortedEarliest
        : this.lang.translations().toastSortedLatest
    );
  }
}
