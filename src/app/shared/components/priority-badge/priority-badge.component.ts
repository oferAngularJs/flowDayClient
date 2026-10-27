import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskPriority } from '../../../core/models/task.model';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (priority()) {
      @case ('URGENT') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#fdf2f2] text-[#cd2b31] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#e5484d]"></span>
          URGENT
        </span>
      }
      @case ('HIGH') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#fff7ed] text-[#c2410c] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
          HIGH
        </span>
      }
      @case ('MEDIUM') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#eff4fe] text-[#2f4ebc] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
          MEDIUM
        </span>
      }
      @case ('LOW') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#f4f5f8] text-[#4e5563] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#9ca3af]"></span>
          LOW
        </span>
      }
    }
  `
})
export class PriorityBadgeComponent {
  readonly priority = input.required<TaskPriority>();
}
