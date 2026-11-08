import { Injectable, NgZone, inject, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  UserCredential,
  getRedirectResult,
  onAuthStateChanged,
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

  /**
   * Short-lived (~1h) Google API access token from the last interactive sign-in.
   * Kept in memory only. Background sync will use server-side refresh tokens (roadmap step 2).
   */
  readonly googleAccessToken = signal<string | null>(null);

  private initialized = false;

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
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        // Some mobile browsers block popups: continue in the same tab instead.
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      this.handleSignInError(err);
    } finally {
      this.zone.run(() => this.isSigningIn.set(false));
    }
  }

  async disconnectGoogleAccount(): Promise<void> {
    await signOut(firebaseAuth);
    this.zone.run(() => {
      this.googleAccessToken.set(null);
      this.toast.show(this.lang.translations().toastDisconnected);
    });
  }

  private createProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    GOOGLE_SCOPES.forEach((scope) => provider.addScope(scope));
    // Always show the account chooser so "Switch account" works.
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  }

  private async handleSignedIn(result: UserCredential): Promise<void> {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const profile = toProfile(result.user);

    this.zone.run(() => {
      this.googleAccessToken.set(credential?.accessToken ?? null);
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
    this.zone.run(() => this.toast.show(this.lang.translations().signInFailed));
  }
}
