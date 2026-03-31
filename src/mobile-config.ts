/**
 * Mobile Configuration Helper
 * Provides utilities for mobile app functionality on Android
 */

import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

/**
 * Check if running on native mobile app (not web)
 */
export const isMobileApp = (): boolean => {
  return !!(window as any).Capacitor?.isNativeAndroid || (window as any).Capacitor?.isNativeIOS;
};

/**
 * Initialize mobile-specific settings
 */
export const initializeMobileApp = async (): Promise<void> => {
  if (!isMobileApp()) return;

  try {
    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        // Exit app on back button if can't go back
        App.exitApp();
      } else {
        // Let browser handle back navigation
        window.history.back();
      }
    });

    // Handle app pause/resume
    App.addListener('pause', () => {
      console.log('App paused');
    });

    App.addListener('resume', () => {
      console.log('App resumed');
    });
  } catch (error) {
    console.warn('Mobile app initialization error:', error);
  }
};

/**
 * Open URL in system browser (useful for OAuth flows)
 */
export const openExternalUrl = async (url: string): Promise<void> => {
  if (!isMobileApp()) {
    window.open(url, '_blank');
    return;
  }

  try {
    await Browser.open({ url });
  } catch (error) {
    console.error('Failed to open URL:', error);
    window.open(url, '_blank');
  }
};

/**
 * Get platform info
 */
export const getPlatformInfo = () => ({
  isMobile: isMobileApp(),
  userAgent: navigator.userAgent,
  platform: navigator.platform,
});
