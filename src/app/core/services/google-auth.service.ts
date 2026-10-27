import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { GoogleAccountProfile, GoogleAuthResponse } from '../models/auth.model';

const DEFAULT_GOOGLE_PROFILE: GoogleAccountProfile = {
  id: 'google-usr-alex-01',
  name: 'Alex Dev',
  firstName: 'Alex',
  email: 'alex.developer@gmail.com',
  avatarInitial: 'A',
  calendarSynced: true,
  tasksSynced: true,
  accessToken: 'ya29.flowday-oauth-token'
};

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly isConnected = signal<boolean>(false);
  readonly currentUser = signal<GoogleAccountProfile | null>(null);

  checkAuthStatus(): void {
    this.api
      .get<GoogleAuthResponse>('/auth/google/status', {
        connected: this.isConnected(),
        profile: this.currentUser(),
        syncedAt: new Date().toISOString()
      })
      .subscribe((res) => {
        this.isConnected.set(res.connected);
        this.currentUser.set(res.profile);
      });
  }

  authorizeGoogleAccount(): void {
    const fallbackResponse: GoogleAuthResponse = {
      connected: true,
      profile: DEFAULT_GOOGLE_PROFILE,
      syncedAt: new Date().toISOString()
    };

    this.api
      .post<GoogleAuthResponse, { scopes: string[] }>(
        '/auth/google/connect',
        { scopes: ['calendar.events', 'tasks'] },
        fallbackResponse
      )
      .subscribe((res) => {
        this.isConnected.set(res.connected);
        this.currentUser.set(res.profile);
        try {
          if (res.profile?.accessToken) {
            localStorage.setItem('flowday_google_token', res.profile.accessToken);
          }
        } catch {
          // Ignore storage error in restricted sandboxes
        }
        this.toast.show(
          'Successfully connected Google Calendar & Tasks',
          'POST /api/v1/auth/google/connect'
        );
      });
  }

  disconnectGoogleAccount(): void {
    this.api
      .post<{ disconnected: boolean }, Record<string, never>>(
        '/auth/google/disconnect',
        {},
        { disconnected: true }
      )
      .subscribe(() => {
        this.isConnected.set(false);
        this.currentUser.set(null);
        try {
          localStorage.removeItem('flowday_google_token');
        } catch {
          // Ignore storage error
        }
        this.toast.show('Google Account disconnected', 'POST /api/v1/auth/google/disconnect');
      });
  }
}
