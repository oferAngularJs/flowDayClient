import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { GoogleAccountProfile } from '../../../core/models/auth.model';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.component.html'
})
export class TopBarComponent {
  readonly langService = inject(LanguageService);

  readonly currentView = input.required<'dashboard' | 'planner'>();
  readonly isConnected = input.required<boolean>();
  readonly googleUser = input<GoogleAccountProfile | null>(null);
  readonly isSyncing = input<boolean>(false);

  readonly toggleView = output<void>();
  readonly openGoogleModal = output<void>();
  readonly disconnectGoogle = output<void>();
  readonly openServerLogModal = output<void>();

  readonly isUserMenuOpen = signal<boolean>(false);

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
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
