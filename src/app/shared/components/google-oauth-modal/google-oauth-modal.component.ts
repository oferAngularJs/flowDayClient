import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { LanguageService } from '../../../core/services/language.service';

/**
 * Explains what Flowday will access, then hands off to Google's own sign-in window.
 * Flowday never sees or handles the user's Google password.
 */
@Component({
  selector: 'app-google-oauth-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './google-oauth-modal.component.html'
})
export class GoogleOauthModalComponent {
  readonly authService = inject(GoogleAuthService);
  readonly langService = inject(LanguageService);

  readonly closeModal = output<void>();
  readonly authorize = output<void>();
}
