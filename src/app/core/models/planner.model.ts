import { TaskPriority } from './task.model';

/** User limits for planning; kept on this device. */
export interface PlannerPrefs {
  /** "HH:mm", 24-hour. */
  dayStart: string;
  dayEnd: string;
  maxMinutesPerDay: number;
}

/** One busy block sent to the planner ("HH:mm", 24-hour). */
export interface BusyBlock {
  start: string;
  end: string;
}

export interface PlannerDay {
  date: string;
  weekday: string;
  busy: BusyBlock[];
}

/** Request body of the generateWeeklyPlan function. */
export interface PlanRequest {
  goal: string;
  language: 'EN' | 'HE';
  days: PlannerDay[];
  prefs: PlannerPrefs;
}

/** One session as returned by the generateWeeklyPlan function. */
export interface PlannedSession {
  title: string;
  date: string;
  start: string;
  end: string;
  priority: TaskPriority;
  category: string;
  step: string;
}

export interface PlanResponse {
  summary: string;
  warning: string;
  tasks: PlannedSession[];
}

/** A proposed session in the app, with its own id and checkbox state. */
export interface ProposedPlanTask extends PlannedSession {
  id: string;
  durationMinutes: number;
  selected: boolean;
}

export interface WeeklyPlan {
  goal: string;
  summary: string;
  warning: string;
  createdAt: number;
  tasks: ProposedPlanTask[];
}

/** One bar of the capacity chart. */
export interface DayCapacity {
  date: string;
  dayLabel: string;
  busyMinutes: number;
  plannedMinutes: number;
  windowMinutes: number;
}
