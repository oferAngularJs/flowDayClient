import { DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Chrome/Edge/Samsung Internet event that lets the page show its own "Install" button. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** After "Not now", the install suggestion stays hidden for this long. */
const INSTALL_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const INSTALL_SNOOZE_KEY = 'flowday_install_snoozed_until';
/** How often an open app checks Render for a new deploy. */
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export type InstallBanner = 'update' | 'in-app-browser' | 'install' | 'install-ios' | null;

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage blocked (private mode): the banner just comes back next visit.
  }
}

/**
 * Everything that makes Flowday behave like a phone app:
 * install prompt (Android/desktop), Add-to-Home-Screen hint (iPhone),
 * a warning inside in-app browsers where Google sign-in is blocked,
 * and a "new version" notice after each deploy.
 */
@Injectable({ providedIn: 'root' })
export class AppInstallService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly zone = inject(NgZone);

  private readonly ua = navigator.userAgent;
  readonly isIos =
    /iPhone|iPad|iPod/i.test(this.ua) || (/Macintosh/.test(this.ua) && navigator.maxTouchPoints > 1);
  readonly isAndroid = /Android/i.test(this.ua);
  /** Facebook, Instagram, TikTok, LinkedIn, Snapchat, Line or a raw Android WebView. */
  readonly isInAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Snapchat|Line\/|; wv\)/i.test(
    this.ua
  );

  readonly isStandalone = signal<boolean>(
    window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
  readonly isOnline = signal<boolean>(navigator.onLine);
  readonly updateReady = signal<boolean>(false);

  private readonly installEvent = signal<BeforeInstallPromptEvent | null>(null);
  private readonly snoozedUntil = signal<number>(readNumber(INSTALL_SNOOZE_KEY));
  private readonly inAppDismissed = signal<boolean>(false);

  /** The one banner to show right now, most important first. */
  readonly banner = computed<InstallBanner>(() => {
    if (this.updateReady()) return 'update';
    if (this.isInAppBrowser && !this.inAppDismissed()) return 'in-app-browser';
    if (this.isStandalone() || this.snoozedUntil() > Date.now()) return null;
    if (this.installEvent()) return 'install';
    if (this.isIos) return 'install-ios';
    return null;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const on = <K extends keyof WindowEventMap>(type: K, handler: (e: WindowEventMap[K]) => void) => {
      const wrapped = (e: WindowEventMap[K]) => this.zone.run(() => handler(e));
      window.addEventListener(type, wrapped);
      destroyRef.onDestroy(() => window.removeEventListener(type, wrapped));
    };

    on('beforeinstallprompt' as keyof WindowEventMap, (e) => {
      e.preventDefault(); // we show our own banner instead of Chrome's mini-infobar
      this.installEvent.set(e as unknown as BeforeInstallPromptEvent);
    });
    on('appinstalled' as keyof WindowEventMap, () => {
      this.installEvent.set(null);
      this.isStandalone.set(true);
    });
    on('online', () => this.isOnline.set(true));
    on('offline', () => this.isOnline.set(false));

    if (this.swUpdate.isEnabled) {
      const sub = this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.zone.run(() => this.updateReady.set(true)));
      // Phones keep the app open for days: check for a new deploy periodically and when reopened.
      const check = () => void this.swUpdate.checkForUpdate().catch(() => undefined);
      const timer = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      const onVisible = () => document.visibilityState === 'visible' && check();
      document.addEventListener('visibilitychange', onVisible);
      destroyRef.onDestroy(() => {
        sub.unsubscribe();
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
      });
      this.swUpdate.unrecoverable.subscribe(() => location.reload());
    }
  }

  async install(): Promise<void> {
    const event = this.installEvent();
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // The event can only be used once.
    this.zone.run(() => {
      this.installEvent.set(null);
      if (outcome === 'dismissed') this.snoozeInstall();
    });
  }

  snoozeInstall(): void {
    const until = Date.now() + INSTALL_SNOOZE_MS;
    writeNumber(INSTALL_SNOOZE_KEY, until);
    this.snoozedUntil.set(until);
  }

  dismissInAppWarning(): void {
    this.inAppDismissed.set(true);
  }

  async applyUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } finally {
      location.reload();
    }
  }

  /** Android only: asks the system to open this page in Chrome. */
  openInChrome(): void {
    const { host, pathname, search } = location;
    location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  async copyLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname);
      return true;
    } catch {
      return false;
    }
  }
}
