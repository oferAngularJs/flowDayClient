import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { LanguageService } from '../../../core/services/language.service';

export interface GoogleAuthCredentials {
  email: string;
  password?: string;
}

@Component({
  selector: 'app-google-oauth-modal',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './google-oauth-modal.component.html'
})
export class GoogleOauthModalComponent {
  readonly authService = inject(GoogleAuthService);
  readonly langService = inject(LanguageService);

  readonly closeModal = output<void>();
  readonly authorize = output<GoogleAuthCredentials>();
  readonly useAnotherAccount = output<void>();

  readonly email = signal<string>(this.authService.currentUser()?.email || '');
  readonly password = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly isSubmitting = signal<boolean>(false);

  readonly isEmailValid = computed(() => {
    const val = this.email().trim();
    // Valid email format check
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  });

  readonly isFormValid = computed(() => {
    return this.isEmailValid() && this.password().trim().length > 0;
  });

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  submitAuth(): void {
    const emailVal = this.email().trim();
    const passwordVal = this.password().trim();

    if (!this.isEmailValid()) {
      this.errorMessage.set('Please enter a valid email address (e.g. name@gmail.com)');
      return;
    }

    if (!passwordVal) {
      this.errorMessage.set('Please enter your password to authenticate');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.authorize.emit({ email: emailVal, password: passwordVal });
    }, 300);
  }

  clearAccount(): void {
    this.email.set('');
    this.password.set('');
    this.errorMessage.set('');
  }
}
