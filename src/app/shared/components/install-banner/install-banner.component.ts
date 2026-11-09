import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppInstallService } from '../../../core/services/app-install.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';

/** One small card above the bottom nav: new version / open in browser / install the app. */
@Component({
  selector: 'app-install-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!install.isOnline()) {
      <div class="fixed top-14 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
        <p class="mt-1 px-3 py-1 rounded-full bg-inverse-surface text-inverse-on-surface text-[11px] shadow flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">cloud_off</span>
          {{ t().offlineNotice }}
        </p>
      </div>
    }

    @if (install.banner(); as banner) {
      <div class="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
        <div
          role="status"
          class="w-full max-w-xl bg-surface-container-lowest border border-outline-variant/50 rounded-2xl shadow-lg p-3 flex items-center gap-3">
          @switch (banner) {
            @case ('update') {
              <span class="material-symbols-outlined text-primary text-[26px] shrink-0">system_update</span>
              <p class="flex-1 text-[13px] font-medium text-on-surface">{{ t().updateAvailable }}</p>
              <button type="button" class="btn-primary" (click)="install.applyUpdate()">{{ t().updateReload }}</button>
            }
            @case ('in-app-browser') {
              <span class="material-symbols-outlined text-error text-[26px] shrink-0">open_in_browser</span>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-on-surface">{{ t().inAppBrowserTitle }}</p>
                <p class="text-[12px] text-on-surface-variant">{{ t().inAppBrowserBody }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  @if (install.isAndroid) {
                    <button type="button" class="btn-primary" (click)="install.openInChrome()">{{ t().openInChrome }}</button>
                  }
                  <button type="button" class="btn-secondary" (click)="copyLink()">{{ t().copyLink }}</button>
                </div>
              </div>
              <button type="button" class="btn-close" [attr.aria-label]="t().notNow" (click)="install.dismissInAppWarning()">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            }
            @case ('install') {
              <img src="assets/icons/icon-192.png" alt="" class="w-10 h-10 rounded-xl shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-on-surface">{{ t().installTitle }}</p>
                <p class="text-[12px] text-on-surface-variant">{{ t().installBody }}</p>
              </div>
              <button type="button" class="btn-secondary" (click)="install.snoozeInstall()">{{ t().notNow }}</button>
              <button type="button" class="btn-primary" (click)="install.install()">{{ t().installButton }}</button>
            }
            @case ('install-ios') {
              <img src="assets/icons/icon-192.png" alt="" class="w-10 h-10 rounded-xl shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-on-surface">{{ t().installTitle }}</p>
                <p class="text-[12px] text-on-surface-variant flex items-center gap-1 flex-wrap">
                  <span class="material-symbols-outlined text-[16px] text-primary">ios_share</span>
                  {{ t().installIosBody }}
                </p>
              </div>
              <button type="button" class="btn-close" [attr.aria-label]="t().notNow" (click)="install.snoozeInstall()">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            }
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .btn-primary {
        @apply shrink-0 px-3 py-1.5 rounded-full bg-primary text-on-primary text-[12px] font-semibold active:scale-95 transition-transform;
      }
      .btn-secondary {
        @apply shrink-0 px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant text-[12px] font-medium active:scale-95 transition-transform;
      }
      .btn-close {
        @apply shrink-0 self-start p-1 rounded-full text-on-surface-variant hover:bg-surface-container;
      }
    `
  ]
})
export class InstallBannerComponent {
  readonly install = inject(AppInstallService);
  private readonly lang = inject(LanguageService);
  private readonly toast = inject(ToastService);
  readonly t = this.lang.translations;

  async copyLink(): Promise<void> {
    const copied = await this.install.copyLink();
    this.toast.show(copied ? this.t().linkCopied : location.origin);
  }
}
