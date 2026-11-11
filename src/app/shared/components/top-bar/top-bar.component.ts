import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { GoogleAccountProfile } from '../../../core/models/auth.model';
import { LanguageService } from '../../../core/services/language.service';
import { TaskService } from '../../../core/services/task.service';
import { TaskItem } from '../../../core/models/task.model';
import { addDaysToKey, localDateKey, timeToMinutes } from '../../../core/utils/date';

/** Most tasks listed in the bell popup; the rest are counted. */
const MAX_UP_NEXT = 8;

export interface UpNextGroup {
  key: 'overdue' | 'today' | 'coming';
  label: string;
  tasks: (TaskItem & { isNow: boolean; whenLabel: string })[];
}

function byDateThenTime(a: TaskItem, b: TaskItem): number {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  const ta = timeToMinutes(a.scheduledStart);
  const tb = timeToMinutes(b.scheduledStart);
  if (ta === null || tb === null) return ta === null ? (tb === null ? 0 : 1) : -1;
  return ta - tb;
}

@Component({
  selector: 'app-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.component.html'
})
export class TopBarComponent {
  readonly langService = inject(LanguageService);
  private readonly taskService = inject(TaskService);

  readonly currentView = input.required<'dashboard' | 'planner'>();
  readonly isConnected = input.required<boolean>();
  readonly googleUser = input<GoogleAccountProfile | null>(null);
  readonly isSyncing = input<boolean>(false);

  readonly toggleView = output<void>();
  readonly openGoogleModal = output<void>();
  readonly disconnectGoogle = output<void>();
  readonly openServerLogModal = output<void>();
  /** A task was tapped in the bell popup: show it on the dashboard. */
  readonly openTask = output<TaskItem>();

  readonly isUserMenuOpen = signal<boolean>(false);
  readonly isUpNextOpen = signal<boolean>(false);
  /** Refreshed when the popup opens, so "today" and "now" are current. */
  private readonly now = signal<Date>(new Date());

  /** Unfinished tasks for the bell popup: overdue, today, then the next days. */
  readonly upNextGroups = computed<UpNextGroup[]>(() => {
    const now = this.now();
    const today = localDateKey(now);
    const tomorrow = addDaysToKey(today, 1);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const t = this.langService.translations();
    const locale = this.langService.isHebrew() ? 'he-IL' : 'en-US';

    const open = this.taskService.allTasks().filter((task) => task.status !== 'DONE').sort(byDateThenTime);
    const dayLabel = (key: string) =>
      key === tomorrow
        ? t.upNextTomorrow
        : new Date(`${key}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    const decorate = (task: TaskItem, withDay: boolean) => {
      const start = timeToMinutes(task.scheduledStart);
      const end = timeToMinutes(task.scheduledEnd);
      const isNow = task.dueDate === today && start !== null && end !== null && start <= nowMinutes && nowMinutes < end;
      const time = start === null ? t.upNextNoTime : task.scheduledStart ?? '';
      return { ...task, isNow, whenLabel: withDay ? `${dayLabel(task.dueDate)} · ${time}` : time };
    };

    let budget = MAX_UP_NEXT;
    const take = (tasks: TaskItem[], withDay: boolean) => {
      const shown = tasks.slice(0, Math.max(0, budget)).map((task) => decorate(task, withDay));
      budget -= shown.length;
      return shown;
    };

    const groups: UpNextGroup[] = [
      { key: 'overdue', label: t.upNextOverdue, tasks: take(open.filter((x) => x.dueDate < today), true) },
      { key: 'today', label: t.upNextToday, tasks: take(open.filter((x) => x.dueDate === today), false) },
      { key: 'coming', label: t.upNextComingUp, tasks: take(open.filter((x) => x.dueDate > today), true) }
    ];
    return groups.filter((g) => g.tasks.length > 0);
  });

  readonly openTaskCount = computed(() => this.taskService.allTasks().filter((x) => x.status !== 'DONE').length);
  readonly hiddenCount = computed(
    () => this.openTaskCount() - this.upNextGroups().reduce((sum, g) => sum + g.tasks.length, 0)
  );
  /** Number on the bell: what still needs doing today, including overdue tasks. */
  readonly bellCount = computed(() => {
    const today = localDateKey();
    return this.taskService.allTasks().filter((x) => x.status !== 'DONE' && x.dueDate <= today).length;
  });
  readonly upNextSubtitle = computed(() =>
    this.openTaskCount() === 1
      ? this.langService.translations().upNextOneLeft
      : this.langService.t('upNextSubtitle', { count: this.openTaskCount() })
  );

  toggleUserMenu(): void {
    this.isUpNextOpen.set(false);
    this.isUserMenuOpen.update((v) => !v);
  }

  toggleUpNext(): void {
    this.isUserMenuOpen.set(false);
    this.now.set(new Date());
    this.isUpNextOpen.update((v) => !v);
  }

  onOpenTask(task: TaskItem): void {
    this.isUpNextOpen.set(false);
    this.openTask.emit(task);
  }

  onSwitchAccount(): void {
    this.isUserMenuOpen.set(false);
    this.openGoogleModal.emit();
  }

  onDisconnect(): void {
    this.isUserMenuOpen.set(false);
    this.disconnectGoogle.emit();
  }
}
