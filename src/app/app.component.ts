import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TopBarComponent } from './shared/components/top-bar/top-bar.component';
import { BottomNavComponent, NavTab } from './shared/components/bottom-nav/bottom-nav.component';
import { GoogleOauthModalComponent } from './shared/components/google-oauth-modal/google-oauth-modal.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { InstallBannerComponent } from './shared/components/install-banner/install-banner.component';
import { AlarmOverlayComponent } from './shared/components/alarm-overlay/alarm-overlay.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PlannerComponent } from './features/planner/planner.component';
import { TaskService } from './core/services/task.service';
import { PlannerService } from './core/services/planner.service';
import { GoogleAuthService } from './core/services/google-auth.service';
import { ToastService } from './core/services/toast.service';
import { ApiService } from './core/services/api.service';
import { LanguageService } from './core/services/language.service';
import { GoogleSyncService } from './core/services/google-sync.service';
import { AppInstallService } from './core/services/app-install.service';
import { ReminderService } from './core/services/reminder.service';
import { TaskItem } from './core/models/task.model';
import { localDateKey } from './core/utils/date';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TopBarComponent,
    BottomNavComponent,
    GoogleOauthModalComponent,
    ToastComponent,
    InstallBannerComponent,
    AlarmOverlayComponent,
    DashboardComponent,
    PlannerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  readonly taskService = inject(TaskService);
  readonly plannerService = inject(PlannerService);
  readonly authService = inject(GoogleAuthService);
  readonly toastService = inject(ToastService);
  readonly apiService = inject(ApiService);
  readonly langService = inject(LanguageService);
  readonly appInstall = inject(AppInstallService);
  // Created at startup so Google sync runs on every screen, not only the dashboard.
  private readonly googleSync = inject(GoogleSyncService);
  // Task reminders ("Notify me") run app-wide too.
  private readonly reminders = inject(ReminderService);

  readonly currentView = signal<'dashboard' | 'planner'>('dashboard');
  readonly isGoogleModalOpen = signal<boolean>(false);
  readonly isServerLogOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.authService.checkAuthStatus();
  }

  switchView(target: 'dashboard' | 'planner'): void {
    this.currentView.set(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleView(): void {
    this.switchView(this.currentView() === 'dashboard' ? 'planner' : 'dashboard');
  }

  onTabChange(tab: NavTab): void {
    if (tab === 'dashboard') {
      this.switchView('dashboard');
    } else if (tab === 'planner' || tab === 'ai') {
      this.switchView('planner');
    } else if (tab === 'tasks') {
      this.toastService.show(this.langService.translations().toastTasksView, 'GET /api/v1/tasks');
    } else if (tab === 'analytics') {
      this.toastService.show(this.langService.translations().toastAnalyticsView, 'GET /api/v1/analytics/velocity');
    }
  }

  /** From the bell popup: open the task's day on the dashboard and point at the task. */
  showTask(task: TaskItem): void {
    const today = localDateKey();
    // Overdue tasks are listed on today's page.
    this.taskService.selectedDate.set(task.dueDate < today ? today : task.dueDate);
    this.currentView.set('dashboard');
    setTimeout(() => {
      const card = document.getElementById('task-card-' + task.id);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-primary');
      setTimeout(() => card.classList.remove('ring-2', 'ring-primary'), 2500);
    }, 150);
  }

  async onAuthorizeGoogle(): Promise<void> {
    await this.authService.signInWithGoogle();
    this.isGoogleModalOpen.set(false);
  }
}
