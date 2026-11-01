import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { LanguageService } from '../../core/services/language.service';
import { BentoStatsComponent } from './components/bento-stats/bento-stats.component';
import { AiInsightCardComponent } from './components/ai-insight-card/ai-insight-card.component';
import { FocusTaskListComponent } from './components/focus-task-list/focus-task-list.component';
import { TaskItem, TaskPriority } from '../../core/models/task.model';

export interface TaskCategoryOption {
  key: string;
  label: string;
  icon: string;
  colorClass: string;
  bgClass: string;
}

export const TASK_CATEGORIES: TaskCategoryOption[] = [
  { key: 'personal', label: 'Personal', icon: 'person', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  { key: 'work', label: 'Work', icon: 'business_center', colorClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  { key: 'engineering', label: 'Engineering', icon: 'terminal', colorClass: 'text-indigo-600', bgClass: 'bg-indigo-50' },
  { key: 'design', label: 'Design', icon: 'palette', colorClass: 'text-purple-600', bgClass: 'bg-purple-50' },
  { key: 'product', label: 'Product', icon: 'rocket_launch', colorClass: 'text-amber-600', bgClass: 'bg-amber-50' },
  { key: 'operations', label: 'Operations', icon: 'tune', colorClass: 'text-slate-600', bgClass: 'bg-slate-50' }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BentoStatsComponent, AiInsightCardComponent, FocusTaskListComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  readonly taskService = inject(TaskService);
  readonly authService = inject(GoogleAuthService);
  readonly langService = inject(LanguageService);
  readonly navigateToPlanner = output<void>();

  // Date management: defaults to today, editable via calendar
  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  readonly formattedDateLabel = computed(() => {
    const raw = this.selectedDate();
    if (!raw) return '';
    const dateObj = new Date(raw + 'T00:00:00');
    const locale = this.langService.isHebrew() ? 'he-IL' : 'en-US';
    return dateObj.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  });

  openDatePicker(inputElement: HTMLInputElement): void {
    if (typeof inputElement.showPicker === 'function') {
      try {
        inputElement.showPicker();
      } catch {
        inputElement.focus();
      }
    } else {
      inputElement.focus();
    }
  }

  // Dynamic user display name from email / auth / default
  readonly userName = computed(() => {
    const user = this.authService.currentUser();
    if (user?.firstName) return user.firstName;
    if (user?.name) return user.name.split(' ')[0];
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'Alex';
  });

  // Dynamic time-based greeting (morning, afternoon, evening, night)
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const t = this.langService.translations();
    if (hour >= 5 && hour < 12) {
      return t.goodMorning;
    } else if (hour >= 12 && hour < 17) {
      return t.goodAfternoon;
    } else if (hour >= 17 && hour < 21) {
      return t.goodEvening;
    } else {
      return t.goodNight;
    }
  });

  readonly showNewTaskModal = signal<boolean>(false);
  readonly newTaskTitle = signal<string>('');
  readonly newTaskCategory = signal<string>('Personal');
  readonly newTaskPriority = signal<TaskPriority>('MEDIUM');
  readonly newTaskDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly isNewTaskCategoryDropdownOpen = signal<boolean>(false);

  // Form validity for Create Task button: title, priority, category, and minimum 30 minutes duration
  readonly isDurationValid = computed(() => {
    return this.calculatedDuration() >= 30;
  });

  readonly isNewTaskValid = computed(() => {
    return (
      this.newTaskTitle().trim().length > 0 &&
      !!this.newTaskPriority() &&
      !!this.newTaskCategory() &&
      this.isDurationValid()
    );
  });

  readonly highlightedTaskId = signal<string | null>(null);

  // Edit Task State
  readonly editingTask = signal<TaskItem | null>(null);
  readonly editTitle = signal<string>('');
  readonly editCategory = signal<string>('Personal');
  readonly editPriority = signal<TaskPriority>('MEDIUM');
  readonly editDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly isEditTaskCategoryDropdownOpen = signal<boolean>(false);

  toggleNewTaskCategoryDropdown(): void {
    this.isNewTaskCategoryDropdownOpen.update((v) => !v);
  }

  toggleEditTaskCategoryDropdown(): void {
    this.isEditTaskCategoryDropdownOpen.update((v) => !v);
  }

  readonly editFromHour = signal<string>('09');
  readonly editFromMinute = signal<string>('00');
  readonly editFromPeriod = signal<'AM' | 'PM'>('AM');
  readonly editToHour = signal<string>('10');
  readonly editToMinute = signal<string>('00');
  readonly editToPeriod = signal<'AM' | 'PM'>('AM');

  readonly categories = TASK_CATEGORIES;

  getCategoryInfo(name: string): TaskCategoryOption {
    return (
      this.categories.find((c) => c.label.toLowerCase() === name?.toLowerCase() || c.key.toLowerCase() === name?.toLowerCase()) || {
        key: 'general',
        label: name || 'General',
        icon: 'folder',
        colorClass: 'text-primary',
        bgClass: 'bg-surface-container'
      }
    );
  }

  getCategoryTranslatedLabel(categoryKeyOrLabel: string): string {
    const key = (categoryKeyOrLabel || '').toLowerCase();
    const t = this.langService.translations();
    switch (key) {
      case 'personal':
        return t.personal;
      case 'work':
        return t.work;
      case 'engineering':
        return t.engineering;
      case 'design':
        return t.design;
      case 'product':
        return t.product;
      case 'operations':
        return t.operations;
      default:
        return categoryKeyOrLabel;
    }
  }

  getPriorityTranslatedLabel(priority: TaskPriority): string {
    const t = this.langService.translations();
    switch (priority) {
      case 'URGENT':
        return t.urgent;
      case 'HIGH':
        return t.high;
      case 'MEDIUM':
        return t.medium;
      case 'LOW':
        return t.low;
    }
  }

  getCurrentTimeSlot(addMinutes = 0): { hour: string; minute: string; period: 'AM' | 'PM' } {
    const now = new Date(Date.now() + addMinutes * 60 * 1000);
    let hours24 = now.getHours();
    const rawMinutes = now.getMinutes();

    let roundedMinutes = Math.round(rawMinutes / 5) * 5;
    if (roundedMinutes === 60) {
      roundedMinutes = 0;
      hours24 = (hours24 + 1) % 24;
    }

    const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;

    const hour = hours12.toString().padStart(2, '0');
    const minute = roundedMinutes.toString().padStart(2, '0');

    return { hour, minute, period };
  }

  private readonly defaultFromTime = this.getCurrentTimeSlot(0);
  private readonly defaultToTime = this.getCurrentTimeSlot(30);

  readonly hours = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  readonly periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  readonly fromHour = signal<string>(this.defaultFromTime.hour);
  readonly fromMinute = signal<string>(this.defaultFromTime.minute);
  readonly fromPeriod = signal<'AM' | 'PM'>(this.defaultFromTime.period);

  readonly toHour = signal<string>(this.defaultToTime.hour);
  readonly toMinute = signal<string>(this.defaultToTime.minute);
  readonly toPeriod = signal<'AM' | 'PM'>(this.defaultToTime.period);

  readonly calculatedDuration = computed(() => {
    let fromH = parseInt(this.fromHour(), 10) % 12;
    if (this.fromPeriod() === 'PM') fromH += 12;
    const fromM = parseInt(this.fromMinute(), 10);
    const startTotal = fromH * 60 + fromM;

    let toH = parseInt(this.toHour(), 10) % 12;
    if (this.toPeriod() === 'PM') toH += 12;
    const toM = parseInt(this.toMinute(), 10);
    let endTotal = toH * 60 + toM;

    if (endTotal < startTotal) {
      endTotal += 24 * 60;
    }
    const diff = endTotal - startTotal;
    return diff > 0 ? diff : 0;
  });

  readonly durationDisplayLabel = computed(() => {
    const mins = this.calculatedDuration();
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  });

  readonly editCalculatedDuration = computed(() => {
    let fromH = parseInt(this.editFromHour(), 10) % 12;
    if (this.editFromPeriod() === 'PM') fromH += 12;
    const fromM = parseInt(this.editFromMinute(), 10);
    const startTotal = fromH * 60 + fromM;

    let toH = parseInt(this.editToHour(), 10) % 12;
    if (this.editToPeriod() === 'PM') toH += 12;
    const toM = parseInt(this.editToMinute(), 10);
    let endTotal = toH * 60 + toM;

    if (endTotal < startTotal) {
      endTotal += 24 * 60;
    }
    const diff = endTotal - startTotal;
    return diff > 0 ? diff : 0;
  });

  readonly editDurationDisplayLabel = computed(() => {
    const mins = this.editCalculatedDuration();
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  });

  readonly priorities: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

  parseTimeString(timeStr?: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
    if (!timeStr) return { hour: '09', minute: '00', period: 'AM' };
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { hour: '09', minute: '00', period: 'AM' };
    const hour = match[1].padStart(2, '0');
    const minNum = parseInt(match[2], 10);
    const roundedMin = (Math.round(minNum / 5) * 5) % 60;
    const minute = roundedMin.toString().padStart(2, '0');
    const period = match[3].toUpperCase() as 'AM' | 'PM';
    return { hour, minute, period };
  }

  scrollToTodayTasks(): void {
    const el = document.getElementById('today-focus-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToOverdueTask(): void {
    const overdueTask = this.taskService.dashboardData().tasks.find((t) => t.status !== 'DONE' && t.isOverdue);
    if (overdueTask) {
      this.highlightedTaskId.set(overdueTask.id);
      const el = document.getElementById(`task-card-${overdueTask.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => {
        this.highlightedTaskId.set(null);
      }, 2500);
    } else {
      this.scrollToTodayTasks();
    }
  }

  openEditTask(task: TaskItem): void {
    this.editingTask.set(task);
    this.editTitle.set(task.title);
    this.editCategory.set(task.category || 'Personal');
    this.editPriority.set(task.priority || 'MEDIUM');
    this.editDate.set(task.dueDate || new Date().toISOString().split('T')[0]);
    this.isEditTaskCategoryDropdownOpen.set(false);

    const start = this.parseTimeString(task.scheduledStart);
    this.editFromHour.set(start.hour);
    this.editFromMinute.set(start.minute);
    this.editFromPeriod.set(start.period);

    const end = this.parseTimeString(task.scheduledEnd);
    this.editToHour.set(end.hour);
    this.editToMinute.set(end.minute);
    this.editToPeriod.set(end.period);
  }

  submitEditTask(): void {
    const task = this.editingTask();
    if (!task) return;

    const title = this.editTitle().trim() || task.title;
    const scheduledStart = `${this.editFromHour()}:${this.editFromMinute()} ${this.editFromPeriod()}`;
    const scheduledEnd = `${this.editToHour()}:${this.editToMinute()} ${this.editToPeriod()}`;
    const durationMinutes = this.editCalculatedDuration() || task.durationMinutes;

    this.taskService.updateTask(task.id, {
      title,
      priority: this.editPriority(),
      category: this.editCategory(),
      dueDate: this.editDate(),
      scheduledStart,
      scheduledEnd,
      durationMinutes
    });

    this.isEditTaskCategoryDropdownOpen.set(false);
    this.editingTask.set(null);
  }

  onSmartReschedule(): void {
    this.taskService.smartRescheduleTask();
    this.navigateToPlanner.emit();
  }

  openNewTaskModal(): void {
    const fromTime = this.getCurrentTimeSlot(0);
    const toTime = this.getCurrentTimeSlot(30);
    this.fromHour.set(fromTime.hour);
    this.fromMinute.set(fromTime.minute);
    this.fromPeriod.set(fromTime.period);

    this.toHour.set(toTime.hour);
    this.toMinute.set(toTime.minute);
    this.toPeriod.set(toTime.period);

    this.newTaskTitle.set('');
    this.newTaskPriority.set('MEDIUM');
    this.newTaskCategory.set('Personal');
    this.newTaskDate.set(new Date().toISOString().split('T')[0]);
    this.isNewTaskCategoryDropdownOpen.set(false);
    this.showNewTaskModal.set(true);
  }

  submitNewTask(): void {
    if (!this.isNewTaskValid()) return;

    const title = this.newTaskTitle().trim();
    const scheduledStart = `${this.fromHour()}:${this.fromMinute()} ${this.fromPeriod()}`;
    const scheduledEnd = `${this.toHour()}:${this.toMinute()} ${this.toPeriod()}`;
    const duration = this.calculatedDuration();

    this.taskService.createNewTask({
      title,
      priority: this.newTaskPriority(),
      scheduledStart,
      scheduledEnd,
      durationMinutes: duration,
      category: this.newTaskCategory(),
      dueDate: this.newTaskDate()
    });

    const newTaskId = this.taskService.pendingTasks()[0]?.id;
    if (newTaskId) {
      this.highlightedTaskId.set(newTaskId);
      setTimeout(() => {
        this.highlightedTaskId.set(null);
      }, 3000);
    }

    this.newTaskTitle.set('');
    this.isNewTaskCategoryDropdownOpen.set(false);
    this.showNewTaskModal.set(false);

    // Give immediate visual feedback and ensure scroll to the newly created task
    setTimeout(() => {
      this.scrollToTodayTasks();
    }, 50);
  }
}
