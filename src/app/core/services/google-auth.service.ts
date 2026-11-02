import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { GoogleAccountProfile, GoogleAuthResponse } from '../models/auth.model';

const STORAGE_KEY_GOOGLE_USER = 'flowday_google_user';
const STORAGE_KEY_GOOGLE_TOKEN = 'flowday_google_token';

function getStoredGoogleUser(): GoogleAccountProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOOGLE_USER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function saveStoredGoogleUser(user: GoogleAccountProfile | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_GOOGLE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_GOOGLE_USER);
    }
  } catch {}
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  private readonly initialUser = getStoredGoogleUser();
  readonly isConnected = signal<boolean>(!!this.initialUser);
  readonly currentUser = signal<GoogleAccountProfile | null>(this.initialUser);

  checkAuthStatus(): void {
    const stored = getStoredGoogleUser();
    if (stored) {
      this.isConnected.set(true);
      this.currentUser.set(stored);
    }
    this.api
      .get<GoogleAuthResponse>('/auth/google/status', {
        connected: this.isConnected(),
        profile: this.currentUser(),
        syncedAt: new Date().toISOString()
      })
      .subscribe((res) => {
        // Only update if server returned valid profile or keep current stored
        if (res.connected && res.profile) {
          this.isConnected.set(true);
          this.currentUser.set(res.profile);
          saveStoredGoogleUser(res.profile);
        }
      });
  }

  authorizeWithCredentials(email: string, _password?: string): void {
    const trimmedEmail = email.trim();
    const emailPrefix = trimmedEmail.split('@')[0] || 'User';
    // Format a friendly display name and first name from email prefix: e.g. ofer.k -> Ofer
    const cleanPrefix = emailPrefix.replace(/[._\-+0-9]+/g, ' ').trim() || emailPrefix;
    const parts = cleanPrefix.split(' ').filter(Boolean);
    const capitalizedParts = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
    const fullName = capitalizedParts.join(' ') || emailPrefix;
    const firstName = capitalizedParts[0] || emailPrefix;
    const initial = firstName.charAt(0).toUpperCase() || 'U';

    const profile: GoogleAccountProfile = {
      id: `google-usr-${Date.now()}`,
      name: fullName,
      firstName,
      email: trimmedEmail,
      avatarInitial: initial,
      calendarSynced: true,
      tasksSynced: true,
      accessToken: `ya29.flowday-${Date.now()}`
    };

    const fallbackResponse: GoogleAuthResponse = {
      connected: true,
      profile,
      syncedAt: new Date().toISOString()
    };

    // Synchronously update state immediately so the greeting updates right away
    this.isConnected.set(true);
    this.currentUser.set(profile);
    saveStoredGoogleUser(profile);
    try {
      localStorage.setItem(STORAGE_KEY_GOOGLE_TOKEN, profile.accessToken || '');
    } catch {}

    this.api
      .post<GoogleAuthResponse, { email: string; scopes: string[] }>(
        '/auth/google/connect',
        { email: trimmedEmail, scopes: ['calendar.events', 'tasks'] },
        fallbackResponse
      )
      .subscribe((res) => {
        if (res.profile) {
          this.currentUser.set(res.profile);
          saveStoredGoogleUser(res.profile);
        }
        this.toast.show(
          `Connected as ${trimmedEmail}`,
          'POST /api/v1/auth/google/connect'
        );
      });
  }

  authorizeGoogleAccount(): void {
    const current = this.currentUser();
    if (current?.email) {
      this.authorizeWithCredentials(current.email);
    } else {
      this.authorizeWithCredentials('alex.developer@gmail.com');
    }
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
        saveStoredGoogleUser(null);
        try {
          localStorage.removeItem(STORAGE_KEY_GOOGLE_TOKEN);
        } catch {}
        this.toast.show('Google Account disconnected', 'POST /api/v1/auth/google/disconnect');
      });
  }
}
