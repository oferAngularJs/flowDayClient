import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-google-oauth-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './google-oauth-modal.component.html'
})
export class GoogleOauthModalComponent {
  readonly closeModal = output<void>();
  readonly authorize = output<void>();
  readonly useAnotherAccount = output<void>();
}
