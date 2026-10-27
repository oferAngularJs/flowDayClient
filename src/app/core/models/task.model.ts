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
}
