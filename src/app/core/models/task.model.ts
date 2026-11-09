export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface TaskItem {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  durationMinutes: number;
  durationLabel: string;
  category: string;
  completedSubtasks?: number;
  totalSubtasks?: number;
  dueDate: string;
  isOverdue?: boolean;
  /** Minutes before the start time to remind the user (5-20); undefined = no reminder. */
  reminderMinutes?: number;
  /** Marked for deletion; removed for good once its Google copy is deleted. */
  deleted?: boolean;
  /** Incremented on every user edit; compared with googleSyncedRevision to know what still needs syncing. */
  revision?: number;
  /** The revision last pushed to Google (Calendar event or Google Task). */
  googleSyncedRevision?: number;
  /** Google Calendar event id, for tasks with a start/end time. */
  googleEventId?: string;
  /** Google Tasks id (in the "Flowday" list), for tasks without a time. */
  googleTaskId?: string;
}

export interface DashboardStats {
  assignedToday: number;
  completedToday: number;
  completionRate: number;
  workloadLeftLabel: string;
  overdueCount: number;
  overdueTaskTitle?: string;
}

export interface AiInsight {
  id: string;
  timestampLabel: string;
  messagePrefix: string;
  highlightedTaskTitle: string;
  highlightedTaskDuration: string;
  messageSuffix: string;
  suggestedDay: string;
}

export interface DashboardSummary {
  dateLabel: string;
  sprintCode: string;
  userName: string;
  highPriorityCount: number;
  totalWorkloadLabel: string;
  stats: DashboardStats;
  aiInsight: AiInsight;
  tasks: TaskItem[];
}

export interface CreateTaskPayload {
  title: string;
  priority: TaskPriority;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  category: string;
  dueDate?: string;
  reminderMinutes?: number;
}
