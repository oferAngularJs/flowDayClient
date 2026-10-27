import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TopBarComponent } from './shared/components/top-bar/top-bar.component';
import { BottomNavComponent, NavTab } from './shared/components/bottom-nav/bottom-nav.component';
import { GoogleOauthModalComponent } from './shared/components/google-oauth-modal/google-oauth-modal.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PlannerComponent } from './features/planner/planner.component';
import { TaskService } from './core/services/task.service';
import { PlannerService } from './core/services/planner.service';
import { GoogleAuthService } from './core/services/google-auth.service';
import { ToastService } from './core/services/toast.service';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TopBarComponent,
    BottomNavComponent,
    GoogleOauthModalComponent,
    ToastComponent,
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

  readonly currentView = signal<'dashboard' | 'planner'>('dashboard');
  readonly isGoogleModalOpen = signal<boolean>(false);
  readonly isServerLogOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.taskService.loadDashboardFromServer();
    this.plannerService.loadWeeklyPlan();
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
      this.toastService.show('Tasks view opened', 'GET /api/v1/tasks');
    } else if (tab === 'analytics') {
      this.toastService.show('Analytics view: 94% on-time velocity', 'GET /api/v1/analytics/velocity');
    }
  }

  onAuthorizeGoogle(): void {
    this.isGoogleModalOpen.set(false);
    this.authService.authorizeGoogleAccount();
  }
}
