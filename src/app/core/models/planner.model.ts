import { TaskPriority } from './task.model';

export interface DailyWorkload {
  dayLabel: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  hoursLabel: string;
  percentageHeight: number;
  isWarning: boolean;
}

export interface CapacityBudget {
  plannedLabel: string;
  totalFreeLabel: string;
  statusLabel: string;
  maxDailyTarget: string;
  dailyDistribution: DailyWorkload[];
  warningDay?: string;
  warningMessage?: string;
}

export interface ProposedPlanTask {
  id: string;
  title: string;
  priority: TaskPriority;
  durationMinutes: number;
  durationLabel: string;
  dateLabel: string;
  tag: string;
  selected: boolean;
}

export interface WeeklyPlanResponse {
  aiModelVersion: string;
  targetGoal: string;
  weekRangeLabel: string;
  syncStatusLabel: string;
  capacity: CapacityBudget;
  proposedTasks: ProposedPlanTask[];
}
