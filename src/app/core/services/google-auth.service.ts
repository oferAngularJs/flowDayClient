import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  UserCredential,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../firebase/firebase';
import { ToastService } from './toast.service';
import { LanguageService } from './language.service';
import { GoogleAccountProfile } from '../models/auth.model';

/** Google API permissions Flowday asks for (must match the OAuth consent screen). */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks'
];

/** Keys written by the old fake sign-in; removed so no stale "user" lingers. */
const LEGACY_STORAGE_KEYS = ['flowday_google_user', 'flowday_google_token'];

/**
 * Google API access token cache. sessionStorage is cleared when the tab/app is closed,
 * and Google tokens expire after ~1h anyway. Background sync (roadmap step 2b) will use
 * server-side refresh tokens instead.
 */
const TOKEN_STORAGE_KEY = 'flowday_google_api_token';
/** Google access tokens last 60 minutes; refresh a bit early. */
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;

interface StoredGoogleToken {
  uid: string;
  token: string;
  expiresAt: number;
}

function toProfile(user: User): GoogleAccountProfile {
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'User';
  const firstName = name.split(' ')[0] || name;
  return {
    id: user.uid,
    name,
    firstName,
    email: user.email ?? '',
    avatarInitial: firstName.charAt(0).toUpperCase() || 'U',
    photoURL: user.photoURL,
    calendarSynced: false,
    tasksSynced: false
  };
}

/** Errors meaning "popups don't work in this browser" — retry as a same-tab redirect. */
function shouldFallBackToRedirect(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment';
}

function readStoredToken(uid: string): StoredGoogleToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredGoogleToken) : null;
    if (parsed && parsed.uid === uid && parsed.expiresAt > Date.now()) {
      return parsed;
    }
  } catch {
    // Unavailable or corrupt storage: treat as no token.
  }
  return null;
}

function writeStoredToken(value: StoredGoogleToken | null): void {
  try {
    if (value) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable; the token just won't survive a reload.
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  private readonly zone = inject(NgZone);

  readonly isConnected = signal<boolean>(false);
  readonly currentUser = signal<GoogleAccountProfile | null>(null);
  /** True until Firebase has restored (or ruled out) a signed-in session. */
  readonly isAuthLoading = signal<boolean>(true);
  readonly isSigningIn = signal<boolean>(false);

  /** Short-lived Google API access token (Calendar + Tasks), or null when expired/missing. */
  private readonly googleToken = signal<StoredGoogleToken | null>(null);
  readonly googleAccessToken = computed(() => this.googleToken()?.token ?? null);
  /** Whether Google Calendar/Tasks can be called right now. */
  readonly hasGoogleAccess = computed(() => !!this.googleToken());

  private initialized = false;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  checkAuthStatus(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Storage may be unavailable (private mode); nothing to clean up then.
    }

    onAuthStateChanged(firebaseAuth, (user) => {
      this.zone.run(() => {
        this.currentUser.set(user ? toProfile(user) : null);
        this.isConnected.set(!!user);
        this.isAuthLoading.set(false);
        this.setGoogleToken(user ? readStoredToken(user.uid) : null);
      });
    });

    // Completes a sign-in that fell back to a full-page redirect (popup blocked).
    getRedirectResult(firebaseAuth)
      .then((result) => result && this.handleSignedIn(result))
      .catch((err) => this.handleSignInError(err));
  }

  async signInWithGoogle(): Promise<void> {
    if (this.isSigningIn()) return;
    this.isSigningIn.set(true);
    const provider = this.createProvider();

    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      await this.handleSignedIn(result);
    } catch (err) {
      if (shouldFallBackToRedirect(err)) {
        // Popups are blocked here (some mobile/in-app browsers): continue in the same tab instead.
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      this.handleSignInError(err);
    } finally {
      this.zone.run(() => this.isSigningIn.set(false));
    }
  }

  /**
   * Returns a valid Google API token. When none is available and `interactive` is true,
   * asks Google again (same account) — this must be called from a user tap so the popup isn't blocked.
   */
  async ensureGoogleAccess(interactive: boolean): Promise<string | null> {
    const current = this.googleToken();
    if (current && current.expiresAt > Date.now()) {
      return current.token;
    }
    const user = firebaseAuth.currentUser;
    if (!interactive || !user || this.isSigningIn()) {
      return null;
    }

    this.isSigningIn.set(true);
    const provider = this.createProvider(user.email);
    try {
      const result = await reauthenticateWithPopup(user, provider);
      const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? null;
      this.zone.run(() => this.storeAccessToken(user.uid, token));
      return token;
    } catch (err) {
      if (shouldFallBackToRedirect(err)) {
        // Same-tab fallback; getRedirectResult() stores the new token when the app reloads.
        await reauthenticateWithRedirect(user, provider);
        return null;
      }
      this.handleSignInError(err);
      return null;
    } finally {
      this.zone.run(() => this.isSigningIn.set(false));
    }
  }

  /** Called when Google rejects the token (401), so the UI offers to reconnect. */
  invalidateGoogleAccess(): void {
    this.setGoogleToken(null);
  }

  async disconnectGoogleAccount(): Promise<void> {
    this.setGoogleToken(null);
    await signOut(firebaseAuth);
    this.zone.run(() => this.toast.show(this.lang.translations().toastDisconnected));
  }

  private createProvider(loginHint?: string | null): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    GOOGLE_SCOPES.forEach((scope) => provider.addScope(scope));
    // Reconnecting goes straight to the signed-in account; a fresh sign-in shows the chooser.
    provider.setCustomParameters(loginHint ? { login_hint: loginHint } : { prompt: 'select_account' });
    return provider;
  }

  private storeAccessToken(uid: string, token: string | null): void {
    this.setGoogleToken(token ? { uid, token, expiresAt: Date.now() + TOKEN_LIFETIME_MS } : null);
  }

  private setGoogleToken(value: StoredGoogleToken | null): void {
    writeStoredToken(value);
    this.googleToken.set(value);

    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    if (value) {
      // Flip the UI to "reconnect" as soon as the token runs out.
      this.expiryTimer = setTimeout(
        () => this.zone.run(() => this.googleToken.set(null)),
        Math.max(0, value.expiresAt - Date.now())
      );
    }
  }

  private async handleSignedIn(result: UserCredential): Promise<void> {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const profile = toProfile(result.user);

    this.zone.run(() => {
      this.storeAccessToken(result.user.uid, credential?.accessToken ?? null);
      this.currentUser.set(profile);
      this.isConnected.set(true);
      this.toast.show(this.lang.t('toastConnectedAs', { email: profile.email }));
    });

    try {
      await this.saveUserProfile(result.user);
    } catch (err) {
      // Sign-in still succeeded; the profile will be saved on the next login.
      console.error('Saving user profile to Firestore failed', err);
    }
  }

  /** Creates or updates users/{uid}. createdAt is only written the first time. */
  private async saveUserProfile(user: User): Promise<void> {
    const ref = doc(firestore, 'users', user.uid);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        uid: user.uid,
        name: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? null,
        language: this.lang.currentLanguage(),
        lastLoginAt: serverTimestamp(),
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() })
      },
      { merge: true }
    );
  }

  private handleSignInError(err: unknown): void {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return; // The user closed Google's window; not an error.
    }
    console.error('Google sign-in failed', err);
    const message =
      code === 'auth/unauthorized-domain'
        ? this.lang.t('signInUnauthorizedDomain', { domain: location.hostname })
        : code === 'auth/network-request-failed'
          ? this.lang.translations().signInNetworkError
          : this.lang.translations().signInFailed;
    // Show the Firebase error code so problems can be diagnosed from a screenshot.
    this.zone.run(() => this.toast.show(message, code ?? undefined));
  }
}
