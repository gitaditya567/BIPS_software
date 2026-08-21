import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

const DISMISS_KEY = 'bips_pwa_prompt_dismissed';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if running in standalone mode (already installed)
  const checkIsInstalled = useCallback(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    return Boolean(isStandalone);
  }, []);

  // Check iOS
  const checkIsIOS = useCallback(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIPhoneOrIPad = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIPhoneOrIPad;
  }, []);

  useEffect(() => {
    const installed = checkIsInstalled();
    setIsInstalled(installed);

    const ios = checkIsIOS();
    setIsIOS(ios);

    // Check dismissal cooldown
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const diff = Date.now() - parseInt(lastDismissed, 10);
      if (diff < DISMISS_COOLDOWN_MS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }

    // Handlers
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt event captured');
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Application successfully installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIsInstalled, checkIsIOS]);

  const promptInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // If on desktop or browser without prompt, show fallback info
      if (!isInstalled) {
        setShowIOSModal(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setIsInstalled(true);
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.error('[PWA] Error during install prompt:', err);
    }
  };

  const dismissPrompt = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  return {
    isInstallable: isInstallable || (isIOS && !isInstalled),
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    isDismissed,
    promptInstall,
    dismissPrompt,
  };
}
