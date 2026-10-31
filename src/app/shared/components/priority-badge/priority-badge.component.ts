import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TaskPriority } from '../../../core/models/task.model';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (priority()) {
      @case ('URGENT') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#fdf2f2] text-[#cd2b31] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#e5484d]"></span>
          {{ langService.translations().urgent }}
        </span>
      }
      @case ('HIGH') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#fff7ed] text-[#c2410c] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
          {{ langService.translations().high }}
        </span>
      }
      @case ('MEDIUM') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#eff4fe] text-[#2f4ebc] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
          {{ langService.translations().medium }}
        </span>
      }
      @case ('LOW') {
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-[#f4f5f8] text-[#4e5563] shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-[#9ca3af]"></span>
          {{ langService.translations().low }}
        </span>
      }
    }
  `
})
export class PriorityBadgeComponent {
  readonly langService = inject(LanguageService);
  readonly priority = input.required<TaskPriority>();
}
