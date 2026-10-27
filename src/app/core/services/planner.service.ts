import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { TaskService } from './task.service';
import { ProposedPlanTask, WeeklyPlanResponse } from '../models/planner.model';
import { TaskItem } from '../models/task.model';

const INITIAL_WEEKLY_PLAN: WeeklyPlanResponse = {
  aiModelVersion: 'AI Model v2.4 Active',
  targetGoal: '"Learn LangGraph with TypeScript and build a small working project."',
  weekRangeLabel: 'This Week (Oct 21 - Oct 27)',
  syncStatusLabel: 'Synced with GitHub & Cal',
  capacity: {
    plannedLabel: '14h 30m',
    totalFreeLabel: '/ 18h Total Free',
    statusLabel: 'Feasible (+3h 30m buffer)',
    maxDailyTarget: 'Max 4h/day target',
    dailyDistribution: [
      { dayLabel: 'Mon', hoursLabel: '2h', percentageHeight: 45, isWarning: false },
      { dayLabel: 'Tue', hoursLabel: '3h', percentageHeight: 65, isWarning: false },
      { dayLabel: 'Wed', hoursLabel: '3.5h', percentageHeight: 75, isWarning: false },
      { dayLabel: 'Thu', hoursLabel: '3h*', percentageHeight: 65, isWarning: true },
      { dayLabel: 'Fri', hoursLabel: '3h', percentageHeight: 65, isWarning: false }
    ],
    warningDay: 'Thursday warning:',
    warningMessage:
      'You already have 4h in sprint tickets. Flowday recommends auto-shifting 1h to Friday morning.'
  },
  proposedTasks: [
    {
      id: 'plan-1',
      title: 'Review LangGraph Core Concepts',
      priority: 'HIGH',
      durationMinutes: 120,
      durationLabel: '2h',
      dateLabel: 'Mon Oct 24',
      tag: 'State & Nodes',
      selected: true
    },
    {
      id: 'plan-2',
      title: 'Build basic cyclic agent graph with tools',
      priority: 'URGENT',
      durationMinutes: 180,
      durationLabel: '3h',
      dateLabel: 'Tue Oct 25',
      tag: 'Agent Loop',
      selected: true
    },
    {
      id: 'plan-3',
      title: 'Add conditional routing & checkpoint memory',
      priority: 'MEDIUM',
      durationMinutes: 210,
      durationLabel: '3h 30m',
      dateLabel: 'Wed Oct 26',
      tag: 'Memory Saver',
      selected: true
    },
    {
      id: 'plan-4',
      title: 'Implement persistence layer & SQLite store',
      priority: 'MEDIUM',
      durationMinutes: 180,
      durationLabel: '3h',
      dateLabel: 'Thu Oct 27',
      tag: 'Storage Driver',
      selected: true
    },
    {
      id: 'plan-5',
      title: 'Deploy mini prototype & test streaming response',
      priority: 'LOW',
      durationMinutes: 180,
      durationLabel: '3h',
      dateLabel: 'Fri Oct 28',
      tag: 'Vercel Edge',
      selected: true
    }
  ]
};

@Injectable({ providedIn: 'root' })
export class PlannerService {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly taskService = inject(TaskService);

  readonly weeklyPlan = signal<WeeklyPlanResponse>(INITIAL_WEEKLY_PLAN);
  readonly isAnalyzing = signal<boolean>(false);

  readonly selectedTasks = computed(() =>
    this.weeklyPlan().proposedTasks.filter((t) => t.selected)
  );

  readonly selectedTaskCount = computed(() => this.selectedTasks().length);
  readonly totalProposedCount = computed(() => this.weeklyPlan().proposedTasks.length);

  loadWeeklyPlan(): void {
    this.api
      .get<WeeklyPlanResponse>('/planner/weekly', this.weeklyPlan())
      .subscribe((plan) => this.weeklyPlan.set(plan));
  }

  toggleTaskSelection(taskId: string): void {
    this.weeklyPlan.update((plan) => ({
      ...plan,
      proposedTasks: plan.proposedTasks.map((t) =>
        t.id === taskId ? { ...t, selected: !t.selected } : t
      )
    }));
  }

  reanalyzeGoal(): void {
    this.isAnalyzing.set(true);
    const updatedPlan: WeeklyPlanResponse = {
      ...this.weeklyPlan(),
      capacity: {
        ...this.weeklyPlan().capacity,
        dailyDistribution: [
          { dayLabel: 'Mon', hoursLabel: '2.5h', percentageHeight: 55, isWarning: false },
          { dayLabel: 'Tue', hoursLabel: '3h', percentageHeight: 65, isWarning: false },
          { dayLabel: 'Wed', hoursLabel: '3h', percentageHeight: 65, isWarning: false },
          { dayLabel: 'Thu', hoursLabel: '2h', percentageHeight: 45, isWarning: false },
          { dayLabel: 'Fri', hoursLabel: '4h', percentageHeight: 82, isWarning: false }
        ],
        warningDay: 'Balanced schedule:',
        warningMessage: '1h shifted from Thursday to Friday morning to prevent sprint overload.'
      }
    };

    this.api
      .post<WeeklyPlanResponse, { goal: string }>(
        '/planner/reanalyze',
        { goal: this.weeklyPlan().targetGoal },
        updatedPlan
      )
      .subscribe((res) => {
        this.weeklyPlan.set(res);
        this.isAnalyzing.set(false);
        this.toast.show('AI re-analyzed workload & balanced Thursday capacity', 'POST /api/v1/planner/reanalyze');
      });
  }

  adjustFilters(): void {
    this.api
      .patch<{ updated: boolean }, { maxHoursPerDay: number }>(
        '/planner/preferences',
        { maxHoursPerDay: 4 },
        { updated: true }
      )
      .subscribe(() => {
        this.toast.show('Preferences updated', 'PATCH /api/v1/planner/preferences');
      });
  }

  acceptPlan(onSuccessNavigate: () => void): void {
    const chosen: ProposedPlanTask[] = this.selectedTasks();
    if (chosen.length === 0) {
      this.toast.show('Please select at least 1 task to accept.');
      return;
    }

    this.api
      .post<{ acceptedCount: number }, { tasks: ProposedPlanTask[] }>(
        '/planner/accept',
        { tasks: chosen },
        { acceptedCount: chosen.length }
      )
      .subscribe((res) => {
        const mappedTasks: TaskItem[] = chosen.map((p) => ({
          id: `accepted-${p.id}-${Date.now()}`,
          title: p.title,
          priority: p.priority,
          status: 'PENDING',
          scheduledStart: p.dateLabel,
          scheduledEnd: 'AI Scheduled',
          durationMinutes: p.durationMinutes,
          durationLabel: p.durationLabel,
          category: p.tag,
          completedSubtasks: 0,
          totalSubtasks: 2,
          dueDate: '2026-10-25'
        }));

        this.taskService.addAcceptedTasksFromPlanner(mappedTasks);
        this.toast.show(
          `✨ ${res.acceptedCount} tasks accepted and added to Sprint W43!`,
          'POST /api/v1/planner/accept'
        );
        setTimeout(() => onSuccessNavigate(), 500);
      });
  }
}
