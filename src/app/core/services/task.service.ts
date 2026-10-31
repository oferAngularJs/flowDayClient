import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { CreateTaskPayload, DashboardSummary, TaskItem } from '../models/task.model';

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function computeDashboardStats(tasks: TaskItem[]): {
  highPriorityCount: number;
  totalWorkloadLabel: string;
  stats: DashboardSummary['stats'];
} {
  const total = tasks.length;
  const completedList = tasks.filter((t) => t.status === 'DONE');
  const pendingList = tasks.filter((t) => t.status !== 'DONE');

  const completedToday = completedList.length;
  const completionRate = total > 0 ? Math.round((completedToday / total) * 100) : 0;

  const remainingMinutes = pendingList.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  const workloadLeftLabel = formatDuration(remainingMinutes);

  const totalMinutes = tasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  const totalWorkloadLabel = formatDuration(totalMinutes);

  const overdueList = pendingList.filter((t) => t.isOverdue);
  const overdueCount = overdueList.length;
  const overdueTaskTitle = overdueList.length > 0 ? overdueList[0].title : undefined;

  const highPriorityCount = pendingList.filter(
    (t) => t.priority === 'HIGH' || t.priority === 'URGENT'
  ).length;

  return {
    highPriorityCount,
    totalWorkloadLabel,
    stats: {
      assignedToday: total,
      completedToday,
      completionRate,
      workloadLeftLabel,
      overdueCount,
      overdueTaskTitle
    }
  };
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Client Architecture Sign-off',
    priority: 'URGENT',
    status: 'PENDING',
    scheduledStart: '09:30 AM',
    scheduledEnd: '10:15 AM',
    durationMinutes: 45,
    durationLabel: '45m',
    category: 'Engineering',
    completedSubtasks: 2,
    totalSubtasks: 3,
    dueDate: '2026-10-24',
    isOverdue: true
  },
  {
    id: 'task-2',
    title: 'Review Q4 design spec',
    priority: 'HIGH',
    status: 'PENDING',
    scheduledStart: '11:30 AM',
    scheduledEnd: '12:15 PM',
    durationMinutes: 45,
    durationLabel: '45m',
    category: 'Product',
    completedSubtasks: 1,
    totalSubtasks: 4,
    dueDate: '2026-10-24'
  },
  {
    id: 'task-3',
    title: 'Daily engineering standup & blocker review',
    priority: 'MEDIUM',
    status: 'DONE',
    scheduledStart: '09:00 AM',
    scheduledEnd: '09:30 AM',
    durationMinutes: 30,
    durationLabel: '30m',
    category: 'Engineering',
    completedSubtasks: 1,
    totalSubtasks: 1,
    dueDate: '2026-10-24'
  }
];

const initialComputed = computeDashboardStats(INITIAL_TASKS);

const INITIAL_DASHBOARD_DATA: DashboardSummary = {
  dateLabel: 'Thursday, Oct 24',
  sprintCode: 'Sprint W43',
  userName: 'Alex',
  highPriorityCount: initialComputed.highPriorityCount,
  totalWorkloadLabel: initialComputed.totalWorkloadLabel,
  stats: initialComputed.stats,
  aiInsight: {
    id: 'insight-w43-1',
    timestampLabel: 'Just now',
    messagePrefix: 'Thursday is getting busy. Consider moving',
    highlightedTaskTitle: '"Review Q4 design spec"',
    highlightedTaskDuration: '(45m)',
    messageSuffix: 'to Friday to balance your focus capacity.',
    suggestedDay: 'Friday'
  },
  tasks: INITIAL_TASKS
};

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly dashboardData = signal<DashboardSummary>(INITIAL_DASHBOARD_DATA);
  readonly isLoading = signal<boolean>(false);
  readonly sortAscending = signal<boolean>(true);

  readonly pendingTasks = computed(() => {
    const tasks = this.dashboardData().tasks.filter((t) => t.status !== 'DONE');
    return this.sortAscending() ? tasks : [...tasks].reverse();
  });

  readonly completedTasks = computed(() =>
    this.dashboardData().tasks.filter((t) => t.status === 'DONE')
  );

  loadDashboardFromServer(): void {
    this.isLoading.set(true);
    this.api.get<DashboardSummary>('/dashboard', this.dashboardData()).subscribe((data) => {
      this.dashboardData.set(data);
      this.isLoading.set(false);
    });
  }

  toggleTaskStatus(taskId: string): void {
    const current = this.dashboardData();
    const target = current.tasks.find((t) => t.id === taskId);
    if (!target) return;

    const newStatus = target.status === 'DONE' ? 'PENDING' : 'DONE';
    const updatedTask: TaskItem = { ...target, status: newStatus };

    this.api
      .patch<TaskItem, { status: string }>(`/tasks/${taskId}/status`, { status: newStatus }, updatedTask)
      .subscribe((savedTask) => {
        this.dashboardData.update((state) => {
          const updatedTasks = state.tasks.map((t) => (t.id === taskId ? savedTask : t));
          const computed = computeDashboardStats(updatedTasks);
          return {
            ...state,
            highPriorityCount: computed.highPriorityCount,
            totalWorkloadLabel: computed.totalWorkloadLabel,
            stats: computed.stats,
            tasks: updatedTasks
          };
        });
        this.toast.show(
          newStatus === 'DONE'
            ? `Task "${target.title}" marked as completed`
            : `Task "${target.title}" reopened`,
          `PATCH /api/v1/tasks/${taskId}/status`
        );
      });
  }

  createNewTask(payload: CreateTaskPayload): void {
    const today = new Date().toISOString().split('T')[0];
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
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
      dueDate: payload.dueDate || today
    };

    this.api.post<TaskItem, CreateTaskPayload>('/tasks', payload, newTask).subscribe((created) => {
      this.dashboardData.update((state) => {
        const updatedTasks = [created, ...state.tasks];
        const computed = computeDashboardStats(updatedTasks);
        return {
          ...state,
          highPriorityCount: computed.highPriorityCount,
          totalWorkloadLabel: computed.totalWorkloadLabel,
          stats: computed.stats,
          tasks: updatedTasks
        };
      });
      this.toast.show(`Created "${created.title}" on server`, 'POST /api/v1/tasks');
    });
  }

  updateTask(taskId: string, changes: Partial<TaskItem>): void {
    const current = this.dashboardData();
    const target = current.tasks.find((t) => t.id === taskId);
    if (!target) return;

    const dur = changes.durationMinutes ?? target.durationMinutes;
    const updatedTask: TaskItem = {
      ...target,
      ...changes,
      durationMinutes: dur,
      durationLabel: formatDuration(dur)
    };

    this.api.patch<TaskItem, Partial<TaskItem>>(`/tasks/${taskId}`, changes, updatedTask).subscribe((savedTask) => {
      this.dashboardData.update((state) => {
        const updatedTasks = state.tasks.map((t) => (t.id === taskId ? savedTask : t));
        const computed = computeDashboardStats(updatedTasks);
        return {
          ...state,
          highPriorityCount: computed.highPriorityCount,
          totalWorkloadLabel: computed.totalWorkloadLabel,
          stats: computed.stats,
          tasks: updatedTasks
        };
      });
      this.toast.show(`Updated "${savedTask.title}"`, `PATCH /api/v1/tasks/${taskId}`);
    });
  }

  smartRescheduleTask(): void {
    this.api
      .post<{ movedTaskId: string }, { targetDay: string }>(
        '/tasks/smart-reschedule',
        { targetDay: 'Friday' },
        { movedTaskId: 'task-2' }
      )
      .subscribe(() => {
        this.toast.show(
          'Smart Reschedule: "Review Q4 design spec" shifted to Friday morning',
          'POST /api/v1/tasks/smart-reschedule'
        );
      });
  }

  addAcceptedTasksFromPlanner(newTasks: TaskItem[]): void {
    this.dashboardData.update((state) => {
      const updatedTasks = [...newTasks, ...state.tasks];
      const computed = computeDashboardStats(updatedTasks);
      return {
        ...state,
        highPriorityCount: computed.highPriorityCount,
        totalWorkloadLabel: computed.totalWorkloadLabel,
        stats: computed.stats,
        tasks: updatedTasks
      };
    });
  }

  toggleSortOrder(): void {
    this.sortAscending.update((v) => !v);
    this.toast.show(
      this.sortAscending() ? 'Sorted tasks by earliest time' : 'Sorted tasks by latest time'
    );
  }
}
