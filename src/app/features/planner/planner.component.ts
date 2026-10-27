import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { PlannerService } from '../../core/services/planner.service';
import { PlanningTargetComponent } from './components/planning-target/planning-target.component';
import { CapacityBudgetComponent } from './components/capacity-budget/capacity-budget.component';
import { ProposedTasksComponent } from './components/proposed-tasks/proposed-tasks.component';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [PlanningTargetComponent, CapacityBudgetComponent, ProposedTasksComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner.component.html'
})
export class PlannerComponent {
  readonly plannerService = inject(PlannerService);
  readonly navigateToDashboard = output<void>();

  onAcceptPlan(): void {
    this.plannerService.acceptPlan(() => this.navigateToDashboard.emit());
  }
}
